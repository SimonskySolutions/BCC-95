import { useMemo, useState } from 'react'
import {
  AI_AGENT_MODULES,
  applyAgentAction,
  runAiOrchestrator,
  runModuleAgent,
} from '../services/ai/agentOrchestratorService.js'
import { useLanguage } from '../i18n/useLanguage.js'

/**
 * @param {{ db: import('../data/mockDatabase.js').MockDatabase }} props
 */
export default function AiAgentsPage({ db }) {
  const { t } = useLanguage()
  const [goal, setGoal] = useState('')
  const [results, setResults] = useState(/** @type {import('../services/ai/agentOrchestratorService.js').AgentResult[]} */ ([]))
  const [selectedModules, setSelectedModules] = useState(
    /** @type {import('../services/ai/agentOrchestratorService.js').AgentModuleId[]} */ ([
      'tasks',
      'manufacturing',
      'quotations',
    ]),
  )
  const [feedback, setFeedback] = useState('')
  const [tick, setTick] = useState(0)

  void tick

  const moduleOptions = useMemo(
    () => AI_AGENT_MODULES.map((moduleId) => ({ id: moduleId, label: t(`ai.module.${moduleId}`) })),
    [t],
  )

  function toggleModule(moduleId) {
    setSelectedModules((current) =>
      current.includes(moduleId) ? current.filter((id) => id !== moduleId) : [...current, moduleId],
    )
  }

  function runSelected() {
    const chosen = selectedModules.length > 0 ? selectedModules : /** @type {typeof selectedModules} */ (['dashboard'])
    setResults(chosen.map((moduleId) => runModuleAgent(db, moduleId)))
    setFeedback(t('ai.ranSelected'))
  }

  function runOrchestrator() {
    const run = runAiOrchestrator(db, { goal })
    setSelectedModules(run.selectedModules)
    setResults(run.results)
    setFeedback(`${t('ai.orchestratorPrefix')} ${run.explanation}`)
  }

  function runSingle(moduleId) {
    setResults((current) => {
      const next = runModuleAgent(db, moduleId)
      const without = current.filter((entry) => entry.moduleId !== moduleId)
      return [next, ...without]
    })
    setFeedback(`${t('ai.agentRan')} ${t(`ai.module.${moduleId}`)}.`)
  }

  function applyAction(moduleId, actionId) {
    const result = applyAgentAction(db, { moduleId, actionId })
    setFeedback(result.message)
    if (result.ok) {
      setTick((x) => x + 1)
      setResults((current) => current.map((entry) => (entry.moduleId === moduleId ? runModuleAgent(db, moduleId) : entry)))
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-5">
        <h2 className="text-base font-semibold text-slate-900">{t('ai.title')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('ai.subtitle')}</p>

        <label className="mt-4 block text-xs font-medium text-slate-700">
          {t('ai.goalLabel')}
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t('ai.goalPlaceholder')}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          {moduleOptions.map((module) => {
            const active = selectedModules.includes(module.id)
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => toggleModule(module.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  active ? 'border-indigo-300 bg-indigo-100 text-indigo-700' : 'border-slate-300 bg-white text-slate-600'
                }`}
              >
                {module.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runOrchestrator}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t('ai.runOrchestrator')}
          </button>
          <button
            type="button"
            onClick={runSelected}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            {t('ai.runSelected')}
          </button>
        </div>
        {feedback ? <p className="mt-3 text-xs text-slate-600">{feedback}</p> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {results.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-sm text-slate-600">
            {t('ai.empty')}
          </p>
        ) : (
          results.map((result) => (
            <article key={result.moduleId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{result.agentName}</h3>
                  <p className="text-xs text-slate-500">{t(`ai.module.${result.moduleId}`)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => runSingle(result.moduleId)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {t('ai.refreshAgent')}
                </button>
              </div>
              <p className="mt-3 text-sm text-slate-700">{result.summary}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                {result.recommendations.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>

              {result.actions.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('ai.actionsTitle')}</p>
                  {result.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-slate-800">{action.label}</p>
                        <p className="text-[11px] text-slate-500">
                          {t('ai.actionImpact')} {action.impact} ·{' '}
                          {action.requiresApproval ? t('ai.approvalRequired') : t('ai.approvalNotRequired')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAction(result.moduleId, action.id)}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        {t('ai.applyAction')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-500">{t('ai.noActions')}</p>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  )
}
