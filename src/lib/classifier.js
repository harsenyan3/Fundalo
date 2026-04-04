import { KNOWN_BUSINESS_ACCOUNTS, KNOWN_SUPPLY_VENDORS } from '../data/mockTransactions.js'

const BUSINESS_KEYWORDS = [
  'cleaning', 'clean', 'service', 'deep clean', 'house clean', 'move-out',
  'move-in', 'weekly', 'rooms', 'helper', 'hoa', 'realty', 'properties',
  'llc', 'supply', 'supplies', 'commercial'
]

const PERSONAL_KEYWORDS = [
  'netflix', 'chick-fil-a', 'publix', 'walmart grocery', 'atm', 'rent',
  'at&t phone', 'gas station'
]

const GHOST_PATTERNS = [
  { pattern: /atm withdrawal/i, reason: 'Cash withdrawal — untracked outflow' },
  { pattern: /cash/i, reason: 'Cash transaction — no digital trail' },
]

export function classifyTransaction(tx, profile) {
  const desc = tx.description.toLowerCase()
  const abs = Math.abs(tx.amount)

  let classification = 'unknown'
  let confidence = 0
  let reason = ''
  let isGhost = false

  for (const g of GHOST_PATTERNS) {
    if (g.pattern.test(desc)) {
      isGhost = true
      reason = g.reason
      break
    }
  }

  const matchesBizAccount = KNOWN_BUSINESS_ACCOUNTS.some(a =>
    desc.includes(a.toLowerCase())
  )
  const matchesSupplyVendor = KNOWN_SUPPLY_VENDORS.some(v =>
    desc.includes(v.toLowerCase())
  )
  const hasBizKeyword = BUSINESS_KEYWORDS.some(k => desc.includes(k))
  const hasPersonalKeyword = PERSONAL_KEYWORDS.some(k => desc.includes(k))

  const isNearAvgPrice = profile?.avgServicePrice
    ? abs >= profile.avgServicePrice * 0.7 && abs <= profile.avgServicePrice * 3
    : false

  const isZelleVenmoIn = (tx.type === 'zelle' || tx.type === 'venmo') && tx.direction === 'in'
  const isZelleVenmoOut = (tx.type === 'zelle' || tx.type === 'venmo') && tx.direction === 'out'

  if (hasPersonalKeyword) {
    classification = 'personal'
    confidence = 88
    reason = 'Matched personal expense keyword'
  } else if (matchesBizAccount) {
    classification = 'business'
    confidence = 95
    reason = 'Verified business entity in description'
  } else if (matchesSupplyVendor && tx.direction === 'out') {
    classification = 'business'
    confidence = 82
    reason = 'Known supply vendor — likely business expense'
  } else if (hasBizKeyword && isZelleVenmoIn) {
    classification = 'business'
    confidence = 91
    reason = 'Service keyword + Zelle/Venmo payment format'
  } else if (isZelleVenmoIn && isNearAvgPrice) {
    classification = 'business'
    confidence = 75
    reason = `Amount near avg service price ($${profile?.avgServicePrice}) via ${tx.type}`
  } else if (isZelleVenmoOut && hasBizKeyword) {
    classification = 'business'
    confidence = 78
    reason = 'Zelle/Venmo outflow with business keyword — likely contractor/supplier'
  } else if (isZelleVenmoIn) {
    classification = 'flagged'
    confidence = 55
    reason = 'Zelle/Venmo inflow — possible business revenue, needs review'
  } else if (tx.type === 'debit' && tx.direction === 'out') {
    classification = 'personal'
    confidence = 65
    reason = 'General debit outflow — likely personal'
  }

  return {
    ...tx,
    classification,
    confidence,
    reason,
    isGhost,
  }
}

export function classifyAll(transactions, profile) {
  return transactions.map(tx => classifyTransaction(tx, profile))
}

export function buildCashflowReport(classified) {
  const business = classified.filter(t => t.classification === 'business')
  const personal = classified.filter(t => t.classification === 'personal')
  const flagged = classified.filter(t => t.classification === 'flagged')
  const ghost = classified.filter(t => t.isGhost)

  const bizRevenue = business
    .filter(t => t.direction === 'in')
    .reduce((sum, t) => sum + t.amount, 0)

  const bizExpenses = business
    .filter(t => t.direction === 'out')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const ghostTotal = ghost
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalIn = classified
    .filter(t => t.direction === 'in')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOut = classified
    .filter(t => t.direction === 'out')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const netCashflow = bizRevenue - bizExpenses
  const dti = bizExpenses > 0 ? (bizExpenses / bizRevenue) : 0

  const monthlyRevenue = bizRevenue / 2
  const monthlyExpenses = bizExpenses / 2
  const monthlyFree = netCashflow / 2
  const debtCapacity = Math.round(monthlyFree * 0.30)
  const loanMin = Math.round((debtCapacity * 18) / 1000) * 1000
  const loanMax = Math.round((debtCapacity * 30) / 1000) * 1000

  const consistencyScore = Math.min(40, Math.round(
    (business.filter(t => t.direction === 'in').length / 10) * 40
  ))
  const marginScore = Math.min(30, Math.round((1 - dti) * 30))
  const ghostPenalty = Math.min(15, Math.round((ghostTotal / (totalIn || 1)) * 15))
  const flaggedBonus = Math.min(10, flagged.length)
  const reliabilityScore = Math.max(0, Math.min(100,
    35 + consistencyScore + marginScore - ghostPenalty + flaggedBonus
  ))

  return {
    bizRevenue: Math.round(bizRevenue),
    bizExpenses: Math.round(bizExpenses),
    netCashflow: Math.round(netCashflow),
    ghostTotal: Math.round(ghostTotal),
    monthlyRevenue: Math.round(monthlyRevenue),
    monthlyExpenses: Math.round(monthlyExpenses),
    monthlyFree: Math.round(monthlyFree),
    debtCapacity,
    loanMin,
    loanMax,
    reliabilityScore,
    dti: Math.round(dti * 100),
    counts: {
      total: classified.length,
      business: business.length,
      personal: personal.length,
      flagged: flagged.length,
      ghost: ghost.length,
    }
  }
}
