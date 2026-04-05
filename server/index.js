import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { classifyAll, buildCashflowReport, normalizeTransaction } from '../src/lib/analysis.js'

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env')

  if (!fs.existsSync(envPath)) {
    return
  }

  const content = fs.readFileSync(envPath, 'utf8')

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) return

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()

    if (key && !process.env[key]) {
      process.env[key] = value
    }
  })
}

loadDotEnv()

const PORT = Number(process.env.PORT || 3001)
const PLAID_BASE_URL = process.env.PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : process.env.PLAID_ENV === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com'
const POLL_RETRIES = 6
const POLL_DELAY_MS = 2500

const sessions = new Map()

function writeCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function json(res, statusCode, data) {
  writeCorsHeaders(res)
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(data))
}

function notFound(res) {
  json(res, 404, { error: 'Not found' })
}

function isPlaidConfigured() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET)
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function requirePlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID
  const secret = process.env.PLAID_SECRET

  if (!clientId || !secret) {
    throw new Error('PLAID_CLIENT_ID and PLAID_SECRET must be set on the API server')
  }

  return { clientId, secret }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function filterTransactionsByDays(transactions, days) {
  if (!Number.isFinite(days) || days <= 0) {
    return transactions
  }

  const threshold = new Date()
  threshold.setDate(threshold.getDate() - days)

  return transactions.filter((tx) => {
    if (!tx.date) return true
    const txDate = new Date(tx.date)
    return Number.isNaN(txDate.getTime()) || txDate >= threshold
  })
}

async function plaidRequest(pathname, body) {
  const { clientId, secret } = requirePlaidConfig()

  const response = await fetch(`${PLAID_BASE_URL}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = payload.error_message || payload.display_message || 'Plaid request failed'
    throw new Error(error)
  }

  return payload
}

async function handleCreateLinkToken(req, res) {
  const { profile = {} } = await readBody(req)
  const language = profile.lang === 'es' ? 'es' : 'en'

  const payload = await plaidRequest('/link/token/create', {
    client_name: 'Fundalo',
    user: {
      client_user_id: crypto.randomUUID(),
    },
    products: ['transactions'],
    country_codes: ['US'],
    language,
    transactions: {
      days_requested: 180,
    },
  })

  json(res, 200, { linkToken: payload.link_token, expiration: payload.expiration })
}

async function handleExchangePublicToken(req, res) {
  const { publicToken } = await readBody(req)

  if (!publicToken) {
    return json(res, 400, { error: 'publicToken is required' })
  }

  const payload = await plaidRequest('/item/public_token/exchange', {
    public_token: publicToken,
  })

  const sessionId = crypto.randomUUID()
  sessions.set(sessionId, {
    accessToken: payload.access_token,
    itemId: payload.item_id,
    createdAt: new Date().toISOString(),
  })

  json(res, 200, { sessionId, itemId: payload.item_id })
}

async function fetchAllTransactions(accessToken) {
  let cursor = null
  let attempts = 0

  while (attempts < POLL_RETRIES) {
    let pageCursor = cursor
    let hasMore = true
    let status = 'NOT_READY'
    const added = []
    const modified = []
    const removed = []

    while (hasMore) {
      const payload = await plaidRequest('/transactions/sync', {
        access_token: accessToken,
        count: 250,
        ...(pageCursor ? { cursor: pageCursor } : {}),
      })

      status = payload.transactions_update_status || status
      added.push(...(payload.added || []))
      modified.push(...(payload.modified || []))
      removed.push(...(payload.removed || []))
      hasMore = Boolean(payload.has_more)
      pageCursor = payload.next_cursor || pageCursor
    }

    const indexed = new Map()
    ;[...added, ...modified].forEach((tx) => {
      indexed.set(tx.transaction_id, tx)
    })
    removed.forEach((entry) => {
      indexed.delete(entry.transaction_id)
    })

    const transactions = Array.from(indexed.values())

    if (transactions.length > 0 || status !== 'NOT_READY') {
      return {
        transactions: transactions.map((tx) => normalizeTransaction(tx, 'plaid')),
        cursor: pageCursor,
        updateStatus: status,
      }
    }

    attempts += 1
    await sleep(POLL_DELAY_MS)
  }

  return {
    transactions: [],
    cursor,
    updateStatus: 'NOT_READY',
  }
}

async function handleAnalyze(req, res) {
  const { sessionId, profile = {}, days = 180 } = await readBody(req)

  if (!sessionId) {
    return json(res, 400, { error: 'sessionId is required' })
  }

  const session = sessions.get(sessionId)
  if (!session) {
    return json(res, 404, { error: 'Plaid session not found. Reconnect the account and try again.' })
  }

  const plaidResult = await fetchAllTransactions(session.accessToken)
  const manualTransactions = Array.isArray(profile.manualTransactions)
    ? profile.manualTransactions.map((tx) => normalizeTransaction(tx, 'manual'))
    : []
  const combinedTransactions = filterTransactionsByDays(
    [...plaidResult.transactions, ...manualTransactions],
    days
  )
  const classified = classifyAll(combinedTransactions, profile)
  const report = buildCashflowReport(classified, profile)

  sessions.set(sessionId, {
    ...session,
    cursor: plaidResult.cursor,
    lastAnalyzedAt: new Date().toISOString(),
  })

  json(res, 200, {
    sessionId,
    source: 'plaid',
    report,
    classified,
    meta: {
      itemId: session.itemId,
      analyzedAt: new Date().toISOString(),
      days,
      plaidTransactionCount: plaidResult.transactions.length,
      manualTransactionCount: manualTransactions.length,
      transactionCount: combinedTransactions.length,
      transactionsUpdateStatus: plaidResult.updateStatus,
    },
  })
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)

    if (req.method === 'OPTIONS') {
      writeCorsHeaders(res)
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, {
        ok: true,
        plaidConfigured: isPlaidConfigured(),
        plaidEnv: process.env.PLAID_ENV || 'sandbox',
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/plaid/create-link-token') {
      return await handleCreateLinkToken(req, res)
    }

    if (req.method === 'POST' && url.pathname === '/api/plaid/exchange-public-token') {
      return await handleExchangePublicToken(req, res)
    }

    if (req.method === 'POST' && url.pathname === '/api/plaid/analyze') {
      return await handleAnalyze(req, res)
    }

    return notFound(res)
  } catch (error) {
    return json(res, 500, { error: error.message || 'Unexpected server error' })
  }
})

server.listen(PORT, () => {
  console.log(`Fundalo API listening on http://localhost:${PORT}`)
})
