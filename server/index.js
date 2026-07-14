import express from 'express'
import multer from 'multer'
import pg from 'pg'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * BCC-95 persistence API.
 *
 * Working data (offers, inquiries, clients, products…) is kept as one jsonb
 * document in `erp_state` (Postgres is the source of truth):
 *   GET  /api/state          → the saved document, or null if none
 *   PUT  /api/state          → upsert the document
 *   POST /api/factory-reset  → drop the working data (delete the row); the
 *                              nomenclature tables below are deliberately kept
 *
 * Master data (the «Номенклатури» tabs) lives in dedicated relational tables —
 * one per tab — seeded once from nomenclatures.seed.json and read by the UI:
 *   GET  /api/nomenclatures  → { suppliers, materials, operations, tools,
 *                               overheads, logistics }
 *
 *   GET  /api/health         → DB connectivity check
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

const { Pool } = pg

const pool = new Pool({
  host: process.env.PGHOST || 'db',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'bcc95',
  password: process.env.PGPASSWORD || 'bcc95',
  database: process.env.PGDATABASE || 'bcc95',
})

const PORT = Number(process.env.PORT) || 3001
const STATE_ID = 'current'

const app = express()
app.use(express.json({ limit: '50mb' }))

// ── Nomenclature tables — one per «Номенклатури» tab ─────────────────────────
// The five cost tabs share an identical shape; suppliers has its own columns.
// Each `seedKey` matches a top-level array in nomenclatures.seed.json.
const COST_TABLES = [
  { table: 'nomenclature_materials', seedKey: 'materials' },
  { table: 'nomenclature_operations', seedKey: 'operations' },
  { table: 'nomenclature_tools', seedKey: 'tools' },
  { table: 'nomenclature_overheads', seedKey: 'overheads' },
  { table: 'nomenclature_logistics', seedKey: 'logistics' },
]

const SUPPLIER_COLS = ['name', 'country', 'post_code', 'city', 'address', 'vat', 'phone', 'email', 'sort_order']
const COST_COLS = ['code', 'label', 'driver', 'defaults', 'sort_order']

function loadSeed() {
  try {
    return JSON.parse(readFileSync(join(__dirname, 'nomenclatures.seed.json'), 'utf8'))
  } catch (err) {
    console.warn('No nomenclatures.seed.json — tables will start empty:', err.message)
    return {}
  }
}

/** Bulk-insert `rows` into `table` for the given columns, in one parameterised statement. */
async function insertRows(table, cols, rows) {
  if (!rows?.length) return
  const values = []
  const tuples = rows.map((row, r) => {
    const ph = cols.map((_, c) => `$${r * cols.length + c + 1}`)
    for (const col of cols) {
      const v = row[col]
      values.push(col === 'defaults' && v != null ? JSON.stringify(v) : v ?? null)
    }
    return `(${ph.join(', ')})`
  })
  await pool.query(`INSERT INTO ${table} (${cols.join(', ')}) VALUES ${tuples.join(', ')}`, values)
}

// ── Users, roles & permissions ───────────────────────────────────────────────
// Role-based access with a "current user" switcher (no passwords). Permissions
// are string keys; a role may hold '*' (all). Module visibility uses
// `module.<navId>`. Effective perms = role.permissions ∪ user.custom_permissions.
const MODULE_IDS = [
  'dashboard', 'products', 'quotations', 'tasks', 'planning', 'manufacturing',
  'machines', 'inventory', 'purchase', 'shipping', 'people', 'messages',
  'quality', 'analytics', 'reports', 'ai-agents', 'crm', 'documentation', 'settings',
]
const mod = (...ids) => ids.map((id) => `module.${id}`)

const BUILTIN_ROLES = [
  { id: 'role-admin', name: 'Admin', built_in: true, permissions: ['*'] },
  {
    id: 'role-manager', name: 'Manager', built_in: true,
    permissions: ['offer.create', 'offer.edit', 'offer.send', 'offer.approve', 'crm.edit', 'audit.view', 'users.manage',
      ...mod('dashboard', 'products', 'quotations', 'tasks', 'planning', 'manufacturing', 'machines',
        'inventory', 'purchase', 'shipping', 'people', 'quality', 'analytics', 'reports', 'ai-agents', 'crm', 'settings')],
  },
  {
    // КТО — конструкторско-технологичен отдел (engineering / production tech)
    id: 'role-mechanic', name: 'Mechanic', built_in: true,
    permissions: [...mod('dashboard', 'products', 'manufacturing', 'machines', 'planning', 'quality',
      'tasks', 'documentation', 'inventory')],
  },
  {
    id: 'role-logistics', name: 'Logistics', built_in: true,
    permissions: [...mod('dashboard', 'shipping', 'purchase', 'inventory', 'planning', 'products', 'tasks')],
  },
  {
    id: 'role-marketing', name: 'Marketing', built_in: true,
    permissions: ['crm.edit',
      ...mod('dashboard', 'crm', 'messages', 'reports', 'analytics', 'products', 'quotations')],
  },
  {
    id: 'role-accountant', name: 'Accountant', built_in: true,
    permissions: ['offer.approve', 'audit.view',
      ...mod('dashboard', 'quotations', 'analytics', 'reports', 'crm', 'purchase')],
  },
]
const ADMIN_USER = { id: 'user-admin', name: 'Administrator', email: 'admin@bcc-95.local', role_id: 'role-admin' }

/** Effective permission list for a user row joined with its role. */
function effectivePerms(rolePerms, customPerms) {
  if ((rolePerms ?? []).includes('*')) return ['*']
  return [...new Set([...(rolePerms ?? []), ...(customPerms ?? [])])]
}

async function initSchema() {
  // Working data
  await pool.query(`
    CREATE TABLE IF NOT EXISTS erp_state (
      id         text PRIMARY KEY,
      doc        jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  // Users & roles (master data — survive Factory reset)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id          text PRIMARY KEY,
      name        text NOT NULL,
      permissions jsonb NOT NULL DEFAULT '[]',
      built_in    boolean NOT NULL DEFAULT false
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                 text PRIMARY KEY,
      name               text NOT NULL,
      email              text,
      role_id            text REFERENCES roles(id),
      active             boolean NOT NULL DEFAULT true,
      custom_permissions jsonb NOT NULL DEFAULT '[]',
      created_at         timestamptz NOT NULL DEFAULT now()
    )
  `)
  // Ensure every built-in role exists (idempotent — adds new roles to existing
  // databases without clobbering any admin-customised permissions).
  for (const r of BUILTIN_ROLES) {
    await pool.query(
      'INSERT INTO roles (id, name, permissions, built_in) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING',
      [r.id, r.name, JSON.stringify(r.permissions), r.built_in],
    )
  }
  // Managers must be able to create users / assign roles — merge the capability
  // in even on databases seeded before this permission existed.
  await pool.query(`
    UPDATE roles
    SET permissions = to_jsonb(ARRAY(SELECT DISTINCT jsonb_array_elements_text(permissions || '["users.manage"]'::jsonb)))
    WHERE id = 'role-manager' AND NOT (permissions ? 'users.manage')
  `)
  // Retire the legacy Sales/Finance roles when no user is assigned to them.
  await pool.query(`
    DELETE FROM roles
    WHERE id IN ('role-sales', 'role-finance')
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.role_id = roles.id)
  `)
  if ((await pool.query('SELECT 1 FROM users LIMIT 1')).rowCount === 0) {
    await pool.query('INSERT INTO users (id, name, email, role_id) VALUES ($1,$2,$3,$4)',
      [ADMIN_USER.id, ADMIN_USER.name, ADMIN_USER.email, ADMIN_USER.role_id])
  }

  // Customer/product documents (bytes stored in Postgres) + portal upload links
  await pool.query(`
    CREATE TABLE IF NOT EXISTS files (
      id          text PRIMARY KEY,
      client_id   text,
      product_id  text,
      folder      text NOT NULL DEFAULT 'General',
      name        text NOT NULL,
      mime        text,
      size        integer,
      bytes       bytea NOT NULL,
      uploaded_by text,
      source      text NOT NULL DEFAULT 'internal',
      uploaded_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS upload_links (
      token      text PRIMARY KEY,
      client_id  text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      revoked    boolean NOT NULL DEFAULT false
    )
  `)

  // Indexes on the columns we filter by (files/links are queried per client/product)
  await pool.query('CREATE INDEX IF NOT EXISTS files_client_idx ON files (client_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS files_product_idx ON files (product_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS files_source_idx ON files (source)')
  await pool.query('CREATE INDEX IF NOT EXISTS upload_links_client_idx ON upload_links (client_id)')
  await pool.query('CREATE INDEX IF NOT EXISTS users_role_idx ON users (role_id)')

  // Master data — one table per tab
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id         serial PRIMARY KEY,
      name       text NOT NULL,
      country    text,
      post_code  text,
      city       text,
      address    text,
      vat        text,
      phone      text,
      email      text,
      active     boolean NOT NULL DEFAULT true,
      sort_order int
    )
  `)
  for (const { table } of COST_TABLES) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id         serial PRIMARY KEY,
        code       text UNIQUE,
        label      text NOT NULL,
        driver     text NOT NULL DEFAULT 'count',
        defaults   jsonb NOT NULL DEFAULT '{}',
        active     boolean NOT NULL DEFAULT true,
        sort_order int
      )
    `)
  }

  // Canonical company registry record (one per legal entity, keyed by VAT).
  // Clients and suppliers reference this — registry data lives here, not in a
  // jsonb bucket. Populated from VIES (EU VAT) lookups.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id            serial PRIMARY KEY,
      country_code  text NOT NULL,
      vat_number    text NOT NULL,
      vat           text,
      eik           text,
      legal_name    text,
      address       text,
      source        text NOT NULL DEFAULT 'vies',
      valid         boolean,
      verified_at   timestamptz,
      raw           jsonb,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now(),
      UNIQUE (country_code, vat_number)
    )
  `)
  // Link suppliers to their registry company (additive, idempotent).
  await pool.query('ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company_id int REFERENCES companies(id)')

  // First-run seed — only fill a table that is still empty (idempotent).
  const seed = loadSeed()
  const isEmpty = async (t) => (await pool.query(`SELECT 1 FROM ${t} LIMIT 1`)).rowCount === 0
  if (await isEmpty('suppliers')) await insertRows('suppliers', SUPPLIER_COLS, seed.suppliers)
  for (const { table, seedKey } of COST_TABLES) {
    if (await isEmpty(table)) await insertRows(table, COST_COLS, seed[seedKey])
  }
}

/** Return the saved dataset document, or null when the system is empty. */
app.get('/api/state', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT doc FROM erp_state WHERE id = $1', [STATE_ID])
    res.json(rows[0]?.doc ?? null)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Upsert the whole dataset document. */
app.put('/api/state', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO erp_state (id, doc, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`,
      [STATE_ID, req.body],
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Factory reset — drop the stored data so the system returns to empty. */
app.post('/api/factory-reset', async (_req, res) => {
  try {
    await pool.query('DELETE FROM erp_state WHERE id = $1', [STATE_ID])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Read all nomenclature tables for the UI dropdowns. */
app.get('/api/nomenclatures', async (_req, res) => {
  try {
    const suppliers = await pool.query(
      `SELECT s.id, s.name, s.country, s.post_code, s.city, s.address, s.vat, s.phone, s.email, s.sort_order,
              s.company_id, co.eik, co.legal_name, co.address AS registry_address, co.verified_at AS registry_verified_at
       FROM suppliers s LEFT JOIN companies co ON co.id = s.company_id
       WHERE s.active ORDER BY s.sort_order NULLS LAST, s.name`,
    )
    const out = { suppliers: suppliers.rows }
    for (const { table, seedKey } of COST_TABLES) {
      const { rows } = await pool.query(
        `SELECT code, label, driver, defaults, sort_order
         FROM ${table} WHERE active ORDER BY sort_order NULLS LAST, label`,
      )
      out[seedKey] = rows
    }
    res.json(out)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Users & roles API ────────────────────────────────────────────────────────
/** Users joined with their role, including the effective permission list. */
app.get('/api/users', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role_id, u.active, u.custom_permissions,
             r.name AS role_name, r.permissions AS role_permissions
      FROM users u LEFT JOIN roles r ON r.id = u.role_id
      ORDER BY u.name
    `)
    res.json(rows.map((u) => ({
      id: u.id, name: u.name, email: u.email, roleId: u.role_id, roleName: u.role_name,
      active: u.active, customPermissions: u.custom_permissions ?? [],
      permissions: effectivePerms(u.role_permissions, u.custom_permissions),
    })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, roleId, customPermissions } = req.body ?? {}
    if (!name?.trim()) return res.status(400).json({ error: 'name required' })
    const id = `user-${randomUUID().slice(0, 8)}`
    await pool.query(
      'INSERT INTO users (id, name, email, role_id, custom_permissions) VALUES ($1,$2,$3,$4,$5)',
      [id, name.trim(), email ?? null, roleId ?? null, JSON.stringify(customPermissions ?? [])],
    )
    res.json({ ok: true, id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.patch('/api/users/:id', async (req, res) => {
  try {
    const fields = []
    const vals = []
    const map = { name: 'name', email: 'email', roleId: 'role_id', active: 'active', customPermissions: 'custom_permissions' }
    for (const [k, col] of Object.entries(map)) {
      if (k in (req.body ?? {})) {
        vals.push(k === 'customPermissions' ? JSON.stringify(req.body[k]) : req.body[k])
        fields.push(`${col} = $${vals.length}`)
      }
    }
    if (!fields.length) return res.json({ ok: true })
    vals.push(req.params.id)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/roles', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, permissions, built_in FROM roles ORDER BY built_in DESC, name')
    res.json(rows.map((r) => ({ id: r.id, name: r.name, permissions: r.permissions ?? [], builtIn: r.built_in })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.patch('/api/roles/:id', async (req, res) => {
  try {
    if ('permissions' in (req.body ?? {})) {
      await pool.query('UPDATE roles SET permissions = $1 WHERE id = $2',
        [JSON.stringify(req.body.permissions), req.params.id])
    }
    if (req.body?.name) {
      await pool.query('UPDATE roles SET name = $1 WHERE id = $2', [req.body.name, req.params.id])
    }
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Documents / files ────────────────────────────────────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

/** Insert a file row from an uploaded buffer; returns the metadata. */
async function storeFile({ clientId, productId, folder, file, uploadedBy, source }) {
  const id = `file-${randomUUID().slice(0, 8)}`
  await pool.query(
    `INSERT INTO files (id, client_id, product_id, folder, name, mime, size, bytes, uploaded_by, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, clientId ?? null, productId ?? null, folder || 'General', file.originalname,
      file.mimetype, file.size, file.buffer, uploadedBy ?? null, source ?? 'internal'],
  )
  return { id, name: file.originalname, mime: file.mimetype, size: file.size }
}

/** Metadata rows (no bytes) for a client, optionally a product/folder. */
function fileListQuery(clientId, productId) {
  const where = ['client_id = $1']
  const params = [clientId]
  if (productId) { params.push(productId); where.push(`product_id = $${params.length}`) }
  return pool.query(
    `SELECT id, client_id, product_id, folder, name, mime, size, uploaded_by, source, uploaded_at
     FROM files WHERE ${where.join(' AND ')} ORDER BY folder, uploaded_at DESC`, params)
}

app.get('/api/files', async (req, res) => {
  try {
    const { clientId, productId } = req.query
    if (!clientId && !productId) return res.status(400).json({ error: 'clientId or productId required' })
    const conds = []
    const params = []
    if (clientId) { params.push(clientId); conds.push(`client_id = $${params.length}`) }
    if (productId) { params.push(productId); conds.push(`product_id = $${params.length}`) }
    const { rows } = await pool.query(
      `SELECT id, client_id, product_id, folder, name, mime, size, uploaded_by, source, uploaded_at
       FROM files WHERE ${conds.join(' AND ')} ORDER BY folder, uploaded_at DESC`, params)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' })
    const meta = await storeFile({
      clientId: req.body.clientId, productId: req.body.productId || null,
      folder: req.body.folder, file: req.file, uploadedBy: req.body.uploadedBy, source: 'internal',
    })
    res.json({ ok: true, ...meta })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

/** Recent uploads across all clients (for the dashboard). `?source=portal` filters. */
app.get('/api/files/recent', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50)
    const src = req.query.source
    const { rows } = await pool.query(
      `SELECT id, client_id, product_id, folder, name, mime, size, uploaded_by, source, uploaded_at
       FROM files ${src ? 'WHERE source = $1' : ''} ORDER BY uploaded_at DESC LIMIT ${limit}`,
      src ? [src] : [])
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/files/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT name, mime, bytes FROM files WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'not found' })
    const f = rows[0]
    res.setHeader('Content-Type', f.mime || 'application/octet-stream')
    const disp = req.query.download ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disp}; filename="${encodeURIComponent(f.name)}"`)
    res.send(f.bytes)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.put('/api/files/:id', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' })
    await pool.query(
      'UPDATE files SET name=$1, mime=$2, size=$3, bytes=$4, uploaded_at=now() WHERE id=$5',
      [req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer, req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/files/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM files WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Customer upload portal (token-scoped, public) ────────────────────────────
/** The working-data doc (clients/products) lives in erp_state jsonb. */
async function getStateDb() {
  const { rows } = await pool.query("SELECT doc FROM erp_state WHERE id = 'current'")
  return rows[0]?.doc?.db ?? null
}
/** Folder list for a client: General + one per product they have a quote/order for. */
function clientFolders(db, clientId) {
  if (!db) return ['General']
  const ids = new Set()
  for (const q of db.quoteDrafts ?? []) if (q.clientId === clientId && q.productId) ids.add(q.productId)
  for (const o of db.clientOrders ?? []) if (o.clientId === clientId && o.productId) ids.add(o.productId)
  const names = [...ids].map((pid) => (db.products ?? []).find((p) => p.id === pid)?.name).filter(Boolean)
  return ['General', ...names]
}
async function resolveLink(token) {
  const { rows } = await pool.query('SELECT client_id FROM upload_links WHERE token = $1 AND NOT revoked', [token])
  return rows[0]?.client_id ?? null
}

// Internal: create / read / revoke a client's upload link
app.post('/api/clients/:clientId/upload-link', async (req, res) => {
  try {
    const token = randomUUID().replace(/-/g, '')
    await pool.query('INSERT INTO upload_links (token, client_id) VALUES ($1,$2)', [token, req.params.clientId])
    res.json({ ok: true, token })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.get('/api/clients/:clientId/upload-link', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT token, created_at FROM upload_links WHERE client_id = $1 AND NOT revoked ORDER BY created_at DESC LIMIT 1',
      [req.params.clientId])
    res.json(rows[0] ?? null)
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.post('/api/upload-links/:token/revoke', async (req, res) => {
  try {
    await pool.query('UPDATE upload_links SET revoked = true WHERE token = $1', [req.params.token])
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// Public portal (no auth — scoped by token)
app.get('/api/portal/:token', async (req, res) => {
  try {
    const clientId = await resolveLink(req.params.token)
    if (!clientId) return res.status(404).json({ error: 'invalid link' })
    const db = await getStateDb()
    const client = (db?.clients ?? []).find((c) => c.id === clientId)
    res.json({ clientName: client?.companyName ?? client?.name ?? 'Customer', folders: clientFolders(db, clientId) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.post('/api/portal/:token/files', upload.single('file'), async (req, res) => {
  try {
    const clientId = await resolveLink(req.params.token)
    if (!clientId) return res.status(404).json({ error: 'invalid link' })
    if (!req.file) return res.status(400).json({ error: 'file required' })
    const db = await getStateDb()
    const folder = req.body.folder || 'General'
    const productId = folder === 'General' ? null : ((db?.products ?? []).find((p) => p.name === folder)?.id ?? null)
    const meta = await storeFile({ clientId, productId, folder, file: req.file, uploadedBy: 'customer', source: 'portal' })
    res.json({ ok: true, ...meta })
  } catch (err) { res.status(500).json({ error: err.message }) }
})
app.get('/api/portal/:token/files', async (req, res) => {
  try {
    const clientId = await resolveLink(req.params.token)
    if (!clientId) return res.status(404).json({ error: 'invalid link' })
    const { rows } = await fileListQuery(clientId, null)
    res.json(rows.map((r) => ({ id: r.id, folder: r.folder, name: r.name, mime: r.mime, size: r.size, uploaded_at: r.uploaded_at, source: r.source })))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── Local AI (Ollama) ────────────────────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://host.docker.internal:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:14b'

/** Call Ollama's chat API with a JSON schema (structured output). */
async function ollamaJson({ system, user, schema, timeoutMs = 90000 }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        format: schema,
        stream: false,
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!r.ok) return { ok: false, code: r.status }
    const data = await r.json()
    try {
      return { ok: true, data: JSON.parse(data.message?.content ?? '{}') }
    } catch {
      return { ok: false, code: 'parse' }
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Is the local model reachable? (drives whether the UI shows the AI button) */
app.get('/api/ai/status', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) })
    const ok = r.ok
    const tags = ok ? await r.json() : null
    res.json({ available: ok, model: OLLAMA_MODEL, models: (tags?.models ?? []).map((m) => m.name) })
  } catch {
    res.json({ available: false, model: OLLAMA_MODEL })
  }
})

/** Extract structured inquiry fields from pasted customer text (email/RFQ). */
app.post('/api/ai/extract-inquiry', async (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'text required' })
  const schema = {
    type: 'object',
    properties: {
      customer: { type: 'string' },
      contact: { type: 'string' },
      email: { type: 'string' },
      product: { type: 'string' },
      quantities: { type: 'array', items: { type: 'integer' } },
      material: { type: 'string' },
      deadline: { type: 'string' },
      summary: { type: 'string' },
      missing: { type: 'array', items: { type: 'string' } },
    },
    required: ['customer', 'product', 'missing'],
  }
  try {
    const out = await ollamaJson({
      system:
        'You extract inquiry fields from a customer email/RFQ for a manufacturing ERP. ' +
        'Use ONLY facts present in the text. Put anything not stated into "missing". Never invent values. ' +
        'Keep the original language for names/materials. ' +
        '"quantities" MUST list every requested piece count as integers — e.g. "250 бр." → [250], ' +
        '"100/200/500" → [100,200,500]. Do NOT put quantities only in the summary.',
      user: text,
      schema,
    })
    if (!out.ok) return res.status(503).json({ error: 'ai_unavailable' })
    const data = out.data ?? {}
    // Fallback: if the model didn't populate quantities, parse them from the text
    // (numbers stated with бр./броя/pcs/units/шт/ks).
    if (!Array.isArray(data.quantities) || data.quantities.length === 0) {
      const qs = []
      const re = /(\d[\d.\s]*)\s*(?:бр\.?|броя|шт\.?|pcs?\.?|pieces?|units?|ks)\b/gi
      let m
      while ((m = re.exec(text))) {
        const n = parseInt(String(m[1]).replace(/[.\s]/g, ''), 10)
        if (n > 0) qs.push(n)
      }
      if (qs.length) data.quantities = [...new Set(qs)]
    }
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: 'ai_unavailable', detail: err.message })
  }
})

/** Plain-text completion from Ollama (no schema). */
async function ollamaText({ system, user, timeoutMs = 60000 }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!r.ok) return { ok: false }
    const data = await r.json()
    return { ok: true, text: (data.message?.content ?? '').trim() }
  } finally {
    clearTimeout(timer)
  }
}

/** Translate free text to EN or BG (for comments/chat). */
app.post('/api/ai/translate', async (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  const target = req.body?.target === 'bg' ? 'Bulgarian' : 'English'
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const out = await ollamaText({
      system: `Translate the user's message into ${target}. Output ONLY the translation — no quotes, no preamble, no notes. Preserve @mentions, proper names, numbers and units exactly.`,
      user: text,
    })
    if (!out.ok) return res.status(503).json({ error: 'ai_unavailable' })
    res.json({ translation: out.text })
  } catch (err) {
    res.status(503).json({ error: 'ai_unavailable', detail: err.message })
  }
})

/** Multi-turn assistant chat (general help for the BCC-95 ERP). */
async function ollamaChat({ messages, timeoutMs = 90000 }) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        options: { temperature: 0.3 },
        messages,
      }),
    })
    if (!r.ok) return { ok: false }
    const data = await r.json()
    return { ok: true, text: (data.message?.content ?? '').trim() }
  } finally {
    clearTimeout(timer)
  }
}

app.post('/api/ai/chat', async (req, res) => {
  const history = Array.isArray(req.body?.messages) ? req.body.messages : []
  // Keep only well-formed turns and cap the context window.
  const turns = history
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
  if (!turns.length) return res.status(400).json({ error: 'messages required' })
  const lang = req.body?.language === 'bg' ? 'Bulgarian' : 'English'
  const context = typeof req.body?.context === 'string' ? req.body.context.slice(0, 12000) : ''
  const system =
    'You are the AI assistant inside BCC 95, a manufacturing ERP for a metal/plastics ' +
    'fabrication company. You help staff with offering, quotations, costing, CRM, ' +
    'production planning and general questions. Be concise and practical. ' +
    `Reply in ${lang} unless the user writes in another language, then match it.`
  const sys = [{ role: 'system', content: system }]
  if (context) {
    sys.push({
      role: 'system',
      content:
        'The following DATA is pulled live from this company\'s ERP and is AUTHORITATIVE and CURRENT. ' +
        'Answer the user\'s question directly using this DATA for specific records (offers, clients, ' +
        'amounts, validity dates, counts). Money/date/count figures must match the DATA exactly. ' +
        'If a client and its offers appear in the DATA, ANSWER WITH THEM — do NOT tell the user to ' +
        'search the CRM or claim you cannot find it, and do NOT treat their spelling as a typo. ' +
        'Only if the requested information is genuinely absent from the DATA should you say it is not ' +
        'on record. Never invent values.\n\n' +
        `DATA:\n${context}`,
    })
  } else {
    sys.push({
      role: 'system',
      content:
        'You do not have specific record data for this question — answer generally or explain where ' +
        'to find it in the app rather than inventing data.',
    })
  }
  try {
    const out = await ollamaChat({ messages: [...sys, ...turns] })
    if (!out.ok) return res.status(503).json({ error: 'ai_unavailable' })
    res.json({ reply: out.text })
  } catch (err) {
    res.status(503).json({ error: 'ai_unavailable', detail: err.message })
  }
})

// ── Company registry (VIES EU VAT lookup) ───────────────────────────────────
const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number'

/** Split a VAT id into ISO country code + number. Accepts "BG131071587". */
function splitVat(raw, defaultCountry = 'BG') {
  const s = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const m = /^([A-Z]{2})(.+)$/.exec(s)
  if (m) return { countryCode: m[1], vatNumber: m[2] }
  return { countryCode: defaultCountry, vatNumber: s }
}

/** Query VIES for one VAT id. Returns the parsed result or null on failure. */
async function viesLookup({ countryCode, vatNumber }) {
  try {
    const r = await fetch(VIES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode, vatNumber }),
      signal: AbortSignal.timeout(12000),
    })
    if (!r.ok) return null
    const d = await r.json()
    return {
      countryCode,
      vatNumber,
      vat: `${countryCode}${vatNumber}`,
      valid: !!d.valid,
      name: d.name && d.name !== '---' ? d.name : null,
      address: d.address && d.address !== '---' ? String(d.address).replace(/\s+/g, ' ').trim() : null,
      raw: d,
    }
  } catch {
    return null
  }
}

/** Insert/update the canonical company row, returning it. */
async function upsertCompany(v) {
  const { rows } = await pool.query(
    `INSERT INTO companies (country_code, vat_number, vat, eik, legal_name, address, source, valid, verified_at, raw, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,'vies',$7, now(), $8, now())
     ON CONFLICT (country_code, vat_number) DO UPDATE SET
       vat = EXCLUDED.vat, eik = EXCLUDED.eik, legal_name = EXCLUDED.legal_name,
       address = EXCLUDED.address, valid = EXCLUDED.valid, verified_at = now(),
       raw = EXCLUDED.raw, updated_at = now()
     RETURNING id, country_code, vat_number, vat, eik, legal_name, address, valid, verified_at`,
    [v.countryCode, v.vatNumber, v.vat, v.countryCode === 'BG' ? v.vatNumber : null, v.name, v.address, v.valid, JSON.stringify(v.raw ?? {})],
  )
  return rows[0]
}

// ── BG Commercial Register (ЕПЗЕУ portal) — live name search ────────────────
const CR_API = 'https://portal.registryagency.bg/CR/api'
// The portal 500s on requests without a User-Agent (Node fetch sends none).
const CR_HEADERS = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) BCC95-ERP/1.0', 'Accept-Language': 'bg' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * The register matches Cyrillic names only, so transliterate Latin input.
 * 'c' is ambiguous (Кока-Кола vs БЦЦ), so return both spellings when it occurs.
 * @param {string} input
 * @returns {string[]} 1-2 candidate spellings
 */
function cyrillicVariants(input) {
  const s = String(input ?? '').trim()
  if (!/[A-Za-z]/.test(s)) return [s]
  const lower = s.toLowerCase()
  const digraphs = [
    ['shch', 'щ'], ['sht', 'щ'], ['sch', 'ш'], ['zh', 'ж'], ['ch', 'ч'], ['sh', 'ш'],
    ['ts', 'ц'], ['yu', 'ю'], ['ju', 'ю'], ['ya', 'я'], ['ja', 'я'], ['ph', 'ф'], ['ck', 'к'],
  ]
  const single = {
    a: 'а', b: 'б', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'и', j: 'й', k: 'к', l: 'л',
    m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в',
    x: 'кс', y: 'й', z: 'з',
  }
  const convert = (cValue) => {
    let out = ''
    for (let i = 0; i < lower.length; ) {
      const hit = digraphs.find(([d]) => lower.startsWith(d, i))
      if (hit) { out += hit[1]; i += hit[0].length; continue }
      const ch = lower[i]
      out += ch === 'c' ? cValue : (single[ch] ?? ch)
      i += 1
    }
    return out
  }
  const variants = new Set([convert('ц'), convert('к')])
  // 'i' after a vowel is usually 'й' in BG names (Lukoil → Лукойл).
  for (const v of [...variants]) {
    const iotated = v.replace(/([аеиоуъюя])и/g, '$1й')
    if (iotated !== v) variants.add(iotated)
  }
  return [...variants]
}

const crCache = new Map() // lowercased query → { at, data }
/** One name query against the register's Deeds/Summary API (10-min cache). */
async function crSearch(name) {
  const key = name.toLowerCase()
  const hit = crCache.get(key)
  // Empty results get a short TTL — they can be a transient portal throttle.
  if (hit && Date.now() - hit.at < (hit.data.length ? 10 * 60_000 : 60_000)) return hit.data
  const r = await fetch(`${CR_API}/Deeds/Summary?page=1&pageSize=10&name=${encodeURIComponent(name)}`, {
    headers: CR_HEADERS,
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  if (!r || !r.ok) return null
  const text = await r.text()
  let data = []
  try { data = text ? JSON.parse(text) : [] } catch { data = [] }
  if (!Array.isArray(data)) data = []
  data = data.filter((x) => !x.isPhysical)
  if (crCache.size > 500) crCache.clear()
  crCache.set(key, { at: Date.now(), data })
  return data
}

/** Search BG companies by name (Cyrillic or Latin input). */
app.get('/api/registry/search', async (req, res) => {
  const name = String(req.query.name ?? '').replace(/\s+/g, ' ').trim()
  if (name.length < 3) return res.json({ ok: true, results: [] })
  try {
    const byEik = new Map()
    let unavailable = true
    for (const variant of cyrillicVariants(name)) {
      const rows = await crSearch(variant)
      if (rows === null) continue
      unavailable = false
      for (const row of rows) {
        if (!byEik.has(row.ident)) byEik.set(row.ident, { eik: row.ident, name: row.name, fullName: row.companyFullName })
      }
      if (byEik.size >= 10) break
    }
    if (unavailable) return res.status(503).json({ error: 'registry_unavailable' })
    res.json({ ok: true, results: [...byEik.values()].slice(0, 10) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * Name + seat address from a BG company's public deed — covers companies
 * without VAT registration, where VIES returns nothing.
 */
async function crDeedInfo(uic) {
  try {
    const r = await fetch(`${CR_API}/Deeds/${encodeURIComponent(uic)}`, {
      headers: CR_HEADERS,
      signal: AbortSignal.timeout(12000),
    })
    if (!r.ok) return null
    const d = await r.json()
    if (!d?.companyName) return null
    const fields = {}
    const walk = (o) => {
      if (Array.isArray(o)) { o.forEach(walk); return }
      if (o && typeof o === 'object') {
        if (o.nameCode && o.htmlData !== undefined && !(o.nameCode in fields)) {
          fields[o.nameCode] = String(o.htmlData).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        }
        for (const k in o) if (k !== 'htmlData') walk(o[k])
      }
    }
    walk(d.sections)
    // CR_F_5_L: "Държава: БЪЛГАРИЯ Област: …, Община: … Населено място: гр. София,
    // п.к. 1404 р-н Триадица бул./ул. бул. „България“ № 69, …"
    const seat = fields.CR_F_5_L ?? ''
    const city = seat.match(/Населено място:\s*([^,]+)/)?.[1]?.trim() ?? ''
    const postCode = seat.match(/п\.к\.\s*(\d{4})/)?.[1] ?? ''
    const street = (seat.match(/бул\.\/ул\.\s*(.+)$/)?.[1] ?? '').replace(/,\s*$/, '').trim()
    const address = [city && `${city}${postCode ? ` ${postCode}` : ''}`, street].filter(Boolean).join(', ')
    return { eik: String(d.uic ?? uic), name: d.companyName, latinName: fields.CR_F_4_L || null, address: address || seat || null }
  } catch {
    return null
  }
}

/** Look up a company by ЕИК (BG) or full VAT, caching the result in companies. */
app.get('/api/registry/lookup', async (req, res) => {
  const country = String(req.query.country ?? 'BG').toUpperCase()
  const id = req.query.vat ?? req.query.eik
  if (!id) return res.status(400).json({ error: 'eik or vat required' })
  const { countryCode, vatNumber } = req.query.vat ? splitVat(req.query.vat, country) : { countryCode: country, vatNumber: String(id).replace(/[^A-Z0-9]/gi, '') }
  const v = await viesLookup({ countryCode, vatNumber })
  if (v?.valid) {
    const company = await upsertCompany(v)
    return res.json({ ok: true, valid: true, company })
  }
  // VIES has nothing (or is down) — for BG companies fall back to the public
  // Commercial Register deed, which also covers non-VAT-registered firms.
  if (countryCode === 'BG') {
    const deed = await crDeedInfo(vatNumber)
    if (deed) {
      return res.json({
        ok: true,
        valid: false,
        company: { country_code: 'BG', eik: deed.eik, vat: null, legal_name: deed.name, address: deed.address, source: 'cr' },
      })
    }
  }
  if (!v) return res.status(503).json({ error: 'registry_unavailable' })
  res.json({ ok: true, valid: false, vat: v.vat })
})

// ── Address geocoding (OpenStreetMap Nominatim, cached server-side) ─────────
const geoCache = new Map() // lowercased query → { at, data|null }

async function nominatim(q) {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': 'BCC95-ERP/1.0 (internal ERP)', 'Accept-Language': 'bg,en' },
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  if (!r || !r.ok) return null
  const d = await r.json().catch(() => null)
  if (!Array.isArray(d) || !d[0]) return null
  return { lat: Number(d[0].lat), lon: Number(d[0].lon), label: d[0].display_name, precision: 'exact' }
}

/** Strip register-style labels the geocoder chokes on (п.к., ет., р-н, quotes). */
function simplifyAddress(q) {
  return q
    .replace(/[„“"]/g, '')
    .replace(/(^|[,\s])(?:гр|с)\.\s*/gi, '$1')
    .replace(/бул\.\/ул\.\s*/gi, '')
    .replace(/\bп\.?\s?к\.?\s*\d{4}\s*,?/gi, '')
    .replace(/\b(?:ет|ап|офис|вх|стая)\.?\s*[\wА-Яа-я-]+\s*,?/gi, '')
    .replace(/\bр-н\s+[А-Яа-я-]+\s*,?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim()
}

/** Geocode a free-text address; falls back to city-level so the pin still lands. */
app.get('/api/registry/geocode', async (req, res) => {
  const q = String(req.query.q ?? '').replace(/\s+/g, ' ').trim()
  if (!q) return res.status(400).json({ error: 'q required' })
  const key = q.toLowerCase()
  const hit = geoCache.get(key)
  if (hit && Date.now() - hit.at < 24 * 3600_000) return res.json({ ok: true, result: hit.data })
  try {
    // "гр."/"с." prefixes confuse Nominatim ("гр. Пловдив" matches a Sofia
    // street named Пловдив) — the bare settlement name ranks correctly.
    const normalized = q.replace(/(^|[,\s])(?:гр|с)\.\s*/gi, '$1').replace(/\s{2,}/g, ' ').trim()
    let result = await nominatim(normalized)
    if (!result) {
      const simple = simplifyAddress(q)
      if (simple && simple.toLowerCase() !== key) {
        await sleep(1100) // Nominatim usage policy: max 1 request/second
        result = await nominatim(simple)
      }
    }
    if (!result) {
      const parts = q.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length >= 2) {
        await sleep(1100)
        result = await nominatim(parts.slice(-2).join(', '))
        if (result) result.precision = 'city'
      }
    }
    if (geoCache.size > 1000) geoCache.clear()
    geoCache.set(key, { at: Date.now(), data: result })
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/** Backfill every vendor that has a VAT number from VIES. */
app.post('/api/registry/backfill-vendors', async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name, vat FROM suppliers WHERE vat IS NOT NULL AND vat <> ''")
    let matched = 0, invalid = 0, failed = 0
    for (const s of rows) {
      const v = await viesLookup(splitVat(s.vat))
      if (!v) { failed += 1; continue }
      if (!v.valid) { invalid += 1; continue }
      const company = await upsertCompany(v)
      await pool.query(
        `UPDATE suppliers SET company_id = $1,
           address = COALESCE(NULLIF(address,''), $2)
         WHERE id = $3`,
        [company.id, company.address, s.id],
      )
      matched += 1
      await new Promise((r) => setTimeout(r, 350)) // be polite to VIES
    }
    res.json({ ok: true, processed: rows.length, matched, invalid, failed })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// Retry schema init briefly — the db container may still be starting up.
async function start() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await initSchema()
      break
    } catch (err) {
      if (attempt === 20) {
        console.error('Could not initialise schema:', err.message)
        process.exit(1)
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  app.listen(PORT, () => console.log(`BCC-95 API listening on :${PORT}`))
}

start()
