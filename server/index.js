import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import nodemailer from 'nodemailer'
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
const APP_URL = process.env.APP_URL || 'http://localhost:5173'
const PLAID_BASE_URL = process.env.PLAID_ENV === 'production'
  ? 'https://production.plaid.com'
  : process.env.PLAID_ENV === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com'
const POLL_RETRIES = 6
const POLL_DELAY_MS = 2500
const USERS_DIR = path.resolve(process.cwd(), 'server', 'data')
const USERS_PATH = path.join(USERS_DIR, 'users.json')

const sessions = new Map()
let mailTransporter = null

function ensureUsersFile() {
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true })
  }

  if (!fs.existsSync(USERS_PATH)) {
    fs.writeFileSync(USERS_PATH, '[]\n', 'utf8')
  }
}

function readUsers() {
  ensureUsersFile()
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'))
  } catch {
    return []
  }
}

function writeUsers(users) {
  ensureUsersFile()
  fs.writeFileSync(USERS_PATH, `${JSON.stringify(users, null, 2)}\n`, 'utf8')
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, originalHash] = String(stored || '').split(':')
  if (!salt || !originalHash) return false
  const candidate = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(originalHash, 'hex'))
}

function serializeUser(user) {
  const {
    passwordHash,
    resetTokenHash,
    resetTokenExpiresAt,
    ...safeUser
  } = user

  return safeUser
}

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.MAIL_FROM
  )
}

function getMailTransporter() {
  if (!isEmailConfigured()) return null
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  return mailTransporter
}

async function sendPasswordResetEmail({ email, name, resetLink }) {
  const transporter = getMailTransporter()
  if (!transporter) {
    return false
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: 'Reset your Fundalo password',
    text: [
      `Hi ${name || 'there'},`,
      '',
      'We received a request to reset your Fundalo password.',
      `Open this link to choose a new password: ${resetLink}`,
      '',
      'This link expires in 30 minutes. If you did not request it, you can ignore this email.',
    ].join('\n'),
    html: `
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your Fundalo password.</p>
      <p><a href="${resetLink}">Open this link to choose a new password</a></p>
      <p>This link expires in 30 minutes. If you did not request it, you can ignore this email.</p>
    `,
  })

  return true
}

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

async function handleRegister(req, res) {
  const { email, password, name } = await readBody(req)
  const normalizedEmail = normalizeEmail(email)
  const trimmedName = String(name || '').trim()

  if (!trimmedName) {
    return json(res, 400, { error: 'Name is required' })
  }

  if (!normalizedEmail) {
    return json(res, 400, { error: 'Email is required' })
  }

  if (String(password || '').length < 6) {
    return json(res, 400, { error: 'Password must be at least 6 characters' })
  }

  const users = readUsers()
  if (users.some((user) => user.email === normalizedEmail)) {
    return json(res, 409, { error: 'An account with this email already exists' })
  }

  const user = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    name: trimmedName,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
    profile: null,
    report: null,
    classified: null,
    lastUpdated: null,
  }

  users.push(user)
  writeUsers(users)
  return json(res, 200, { user: serializeUser(user) })
}

async function handleLogin(req, res) {
  const { email, password } = await readBody(req)
  const normalizedEmail = normalizeEmail(email)
  const users = readUsers()
  const user = users.find((entry) => entry.email === normalizedEmail)

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json(res, 401, { error: 'Incorrect email or password' })
  }

  return json(res, 200, { user: serializeUser(user) })
}

async function handleSaveUserData(req, res) {
  const { userId, profile = null, report = null, classified = null } = await readBody(req)
  if (!userId) {
    return json(res, 400, { error: 'userId is required' })
  }

  const users = readUsers()
  const index = users.findIndex((entry) => entry.id === userId)
  if (index === -1) {
    return json(res, 404, { error: 'User not found' })
  }

  const updatedUser = {
    ...users[index],
    profile,
    report,
    classified,
    lastUpdated: new Date().toISOString(),
  }

  users[index] = updatedUser
  writeUsers(users)
  return json(res, 200, { user: serializeUser(updatedUser) })
}

async function handleForgotPassword(req, res) {
  const { email } = await readBody(req)
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail) {
    return json(res, 400, { error: 'Email is required' })
  }

  const users = readUsers()
  const index = users.findIndex((entry) => entry.email === normalizedEmail)

  if (index === -1) {
    return json(res, 200, {
      ok: true,
      message: 'If an account exists for that email, a recovery link has been sent.',
    })
  }

  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
  const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  const resetLink = `${APP_URL}/?resetToken=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(normalizedEmail)}`

  users[index] = {
    ...users[index],
    resetTokenHash,
    resetTokenExpiresAt,
  }
  writeUsers(users)

  const emailSent = await sendPasswordResetEmail({
    email: normalizedEmail,
    name: users[index].name,
    resetLink,
  })

  return json(res, 200, {
    ok: true,
    emailSent,
    message: emailSent
      ? 'Recovery email sent.'
      : 'Recovery is ready, but SMTP is not configured yet.',
    ...(emailSent ? {} : { previewUrl: resetLink }),
  })
}

async function handleResetPassword(req, res) {
  const { email, token, password } = await readBody(req)
  const normalizedEmail = normalizeEmail(email)

  if (!normalizedEmail || !token || String(password || '').length < 6) {
    return json(res, 400, { error: 'Email, token, and a 6+ character password are required' })
  }

  const users = readUsers()
  const index = users.findIndex((entry) => entry.email === normalizedEmail)
  if (index === -1) {
    return json(res, 400, { error: 'Reset link is invalid or expired' })
  }

  const user = users[index]
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const tokenValid = user.resetTokenHash && user.resetTokenHash === tokenHash
  const tokenNotExpired = user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) > new Date()

  if (!tokenValid || !tokenNotExpired) {
    return json(res, 400, { error: 'Reset link is invalid or expired' })
  }

  const updatedUser = {
    ...user,
    passwordHash: hashPassword(password),
    resetTokenHash: null,
    resetTokenExpiresAt: null,
  }

  users[index] = updatedUser
  writeUsers(users)

  return json(res, 200, { user: serializeUser(updatedUser) })
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
        emailConfigured: isEmailConfigured(),
      })
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      return await handleRegister(req, res)
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      return await handleLogin(req, res)
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/save-user-data') {
      return await handleSaveUserData(req, res)
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
      return await handleForgotPassword(req, res)
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/reset-password') {
      return await handleResetPassword(req, res)
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
