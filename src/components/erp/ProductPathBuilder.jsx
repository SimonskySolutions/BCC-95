import { useCallback, useMemo, useState } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { selectOperationsByProduct } from '../../domains/operations/selectors.js'
import { selectPathLinkByProduct, selectPathTemplateById } from '../../domains/manufacturing-path/selectors.js'
import { upsertProductPathTemplate } from '../../domains/manufacturing-path/mutations.js'
import { useLanguage } from '../../i18n/useLanguage.js'

const nodeStyleByKind = {
  start: { background: '#dcfce7', borderColor: '#22c55e' },
  end: { background: '#fee2e2', borderColor: '#ef4444' },
  sector: { background: '#e0f2fe', borderColor: '#0ea5e9' },
  operation: { background: '#ede9fe', borderColor: '#8b5cf6' },
  machine: { background: '#ffedd5', borderColor: '#f97316' },
}

/**
 * @param {import('../../domains/manufacturing-path/model.js').PathGraphNodeData['kind']} kind
 * @returns {{ background: string; borderColor: string }}
 */
function nodeStyleForKind(kind) {
  return nodeStyleByKind[kind] ?? { background: '#f8fafc', borderColor: '#94a3b8' }
}

/**
 * @param {import('../../domains/operations/model.js').Operation[]} operations
 * @returns {{ nodes: import('@xyflow/react').Node[]; edges: import('@xyflow/react').Edge[] }}
 */
function buildDefaultGraph(operations) {
  const startNode = {
    id: 'path-start',
    position: { x: 40, y: 160 },
    data: { label: 'Raw material', kind: 'start' },
    style: { ...nodeStyleForKind('start'), borderWidth: 2, borderRadius: 14, padding: 8 },
  }
  const endNode = {
    id: 'path-end',
    position: { x: Math.max(240, operations.length * 220 + 240), y: 160 },
    data: { label: 'Ready for shipping', kind: 'end' },
    style: { ...nodeStyleForKind('end'), borderWidth: 2, borderRadius: 14, padding: 8 },
  }
  const opNodes = operations.map((op, index) => ({
    id: `path-op-${op.id}`,
    position: { x: 220 + index * 220, y: 160 },
    data: { label: `${op.sequence}. ${op.name}`, kind: 'operation', operationId: op.id },
    style: { ...nodeStyleForKind('operation'), borderWidth: 2, borderRadius: 14, padding: 8 },
  }))
  const allNodes = [startNode, ...opNodes, endNode]
  const allEdges = allNodes.slice(0, -1).map((node, index) => ({
    id: `edge-${node.id}-${allNodes[index + 1].id}`,
    source: node.id,
    target: allNodes[index + 1].id,
    animated: true,
    style: { strokeWidth: 2 },
  }))
  return { nodes: allNodes, edges: allEdges }
}

/**
 * @param {import('../../domains/manufacturing-path/model.js').PathGraphNode[]} graphNodes
 * @param {import('../../domains/manufacturing-path/model.js').PathGraphEdge[]} graphEdges
 * @returns {{ nodes: import('@xyflow/react').Node[]; edges: import('@xyflow/react').Edge[] }}
 */
function inflateGraph(graphNodes, graphEdges) {
  const nodes = graphNodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: node.data,
    style: { ...nodeStyleForKind(node.data.kind), borderWidth: 2, borderRadius: 14, padding: 8 },
  }))
  const edges = graphEdges.map((edge) => ({
    ...edge,
    animated: true,
    style: { strokeWidth: 2 },
  }))
  return { nodes, edges }
}

/**
 * @param {import('@xyflow/react').Node[]} nodes
 */
function sanitizeNodes(nodes) {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: {
      label: String(node.data?.label ?? ''),
      kind: /** @type {'start' | 'sector' | 'operation' | 'machine' | 'end'} */ (node.data?.kind ?? 'sector'),
      ...(node.data?.operationId ? { operationId: String(node.data.operationId) } : {}),
      ...(node.data?.machineId ? { machineId: String(node.data.machineId) } : {}),
    },
  }))
}

/**
 * @param {import('@xyflow/react').Edge[]} edges
 */
function sanitizeEdges(edges) {
  return edges.map((edge) => ({ id: edge.id, source: edge.source, target: edge.target }))
}

/**
 * @param {{ db: import('../../data/mockDatabase.js').MockDatabase; productId: string; onSaved?: () => void }} props
 */
export default function ProductPathBuilder({ db, productId, onSaved }) {
  const { t } = useLanguage()
  const productOps = useMemo(() => selectOperationsByProduct(db, productId), [db, productId])
  const pathTemplate = useMemo(() => {
    const link = selectPathLinkByProduct(db, productId)
    return link ? selectPathTemplateById(db, link.pathTemplateId) : undefined
  }, [db, productId])

  const initialGraph = useMemo(() => {
    if (pathTemplate?.graphNodes && pathTemplate?.graphEdges) {
      return inflateGraph(pathTemplate.graphNodes, pathTemplate.graphEdges)
    }
    return buildDefaultGraph(productOps)
  }, [pathTemplate, productOps])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialGraph.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialGraph.edges)
  const [templateName, setTemplateName] = useState(pathTemplate?.name ?? `Path ${productId}`)
  const [templateDescription, setTemplateDescription] = useState(pathTemplate?.description ?? '')
  const [selectedNodeId, setSelectedNodeId] = useState(/** @type {string | null} */ (null))
  const [saveMsg, setSaveMsg] = useState(/** @type {{ ok: boolean; text: string } | null} */ (null))
  const [nodeCounter, setNodeCounter] = useState(1)

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((node) => node.id === selectedNodeId) : undefined),
    [nodes, selectedNodeId],
  )

  const onConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) {
        setSaveMsg({ ok: false, text: t('mfg.pathConnectInvalid') })
        return
      }
      const duplicate = edges.some((edge) => edge.source === connection.source && edge.target === connection.target)
      if (duplicate) {
        setSaveMsg({ ok: false, text: t('mfg.pathConnectDuplicate') })
        return
      }
      setSaveMsg(null)
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, eds))
    },
    [edges, setEdges, t],
  )

  /**
   * @param {'sector' | 'operation' | 'machine'} kind
   */
  function addNode(kind) {
    const next = nodeCounter + 1
    const id = `path-${kind}-${next}`
    setNodeCounter(next)
    const label =
      kind === 'operation' ? t('mfg.pathNewOperation') : kind === 'machine' ? t('mfg.pathNewMachine') : t('mfg.pathNewSector')
    setNodes((current) => [
      ...current,
      {
        id,
        position: { x: 140 + current.length * 80, y: 260 + (current.length % 4) * 60 },
        data: { label, kind },
        style: { ...nodeStyleForKind(kind), borderWidth: 2, borderRadius: 14, padding: 8 },
      },
    ])
    setSelectedNodeId(id)
  }

  function removeSelectedNode() {
    if (!selectedNodeId || !selectedNode || selectedNode.data.kind === 'start' || selectedNode.data.kind === 'end') return
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  function savePath() {
    const result = upsertProductPathTemplate(db, {
      productId,
      name: templateName,
      description: templateDescription,
      graphNodes: sanitizeNodes(nodes),
      graphEdges: sanitizeEdges(edges),
    })
    if (!result.ok) {
      setSaveMsg({ ok: false, text: result.errors.join(', ') })
      return
    }
    setSaveMsg({ ok: true, text: t('mfg.pathSaved') })
    onSaved?.()
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{t('mfg.pathBuilderTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('mfg.pathBuilderHelp')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addNode('sector')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {t('mfg.pathAddSector')}
          </button>
          <button
            type="button"
            onClick={() => addNode('operation')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {t('mfg.pathAddOperation')}
          </button>
          <button
            type="button"
            onClick={() => addNode('machine')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {t('mfg.pathAddMachine')}
          </button>
          <button
            type="button"
            onClick={removeSelectedNode}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700"
          >
            {t('mfg.pathRemoveNode')}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          {t('mfg.pathTemplateName')}
          <input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-slate-700">
          {t('mfg.pathTemplateDescription')}
          <input
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="h-[460px] overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('mfg.pathNodeEditor')}</p>
          {!selectedNode ? (
            <p className="mt-3 text-sm text-slate-500">{t('mfg.pathSelectNodeHint')}</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">
                {t('mfg.pathNodeKind')}: <span className="font-semibold">{selectedNode.data.kind}</span>
              </div>
              <label className="text-xs font-medium text-slate-700">
                {t('mfg.pathNodeLabel')}
                <input
                  value={String(selectedNode.data.label ?? '')}
                  onChange={(e) =>
                    setNodes((current) =>
                      current.map((node) =>
                        node.id === selectedNode.id ? { ...node, data: { ...node.data, label: e.target.value } } : node,
                      ),
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                />
              </label>

              {selectedNode.data.kind === 'operation' ? (
                <label className="text-xs font-medium text-slate-700">
                  {t('mfg.pathNodeOperation')}
                  <select
                    value={String(selectedNode.data.operationId ?? '')}
                    onChange={(e) => {
                      const op = productOps.find((candidate) => candidate.id === e.target.value)
                      setNodes((current) =>
                        current.map((node) =>
                          node.id === selectedNode.id
                            ? {
                                ...node,
                                data: {
                                  ...node.data,
                                  operationId: e.target.value || undefined,
                                  label: op ? `${op.sequence}. ${op.name}` : String(node.data.label ?? ''),
                                },
                              }
                            : node,
                        ),
                      )
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  >
                    <option value="">{t('common.none')}</option>
                    {productOps.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.sequence}. {op.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedNode.data.kind === 'machine' ? (
                <label className="text-xs font-medium text-slate-700">
                  {t('mfg.pathNodeMachine')}
                  <select
                    value={String(selectedNode.data.machineId ?? '')}
                    onChange={(e) => {
                      const machine = db.machines.find((m) => m.id === e.target.value)
                      setNodes((current) =>
                        current.map((node) =>
                          node.id === selectedNode.id
                            ? {
                                ...node,
                                data: {
                                  ...node.data,
                                  machineId: e.target.value || undefined,
                                  label: machine ? machine.name : String(node.data.label ?? ''),
                                },
                              }
                            : node,
                        ),
                      )
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  >
                    <option value="">{t('common.none')}</option>
                    {db.machines.map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600">{t('mfg.pathSaveHint')}</p>
        <button
          type="button"
          onClick={savePath}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {t('mfg.pathSave')}
        </button>
      </div>
      {saveMsg ? (
        <p className={`mt-3 text-sm ${saveMsg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{saveMsg.text}</p>
      ) : null}
    </section>
  )
}
