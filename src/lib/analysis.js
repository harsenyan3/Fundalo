const PERSONAL_KEYWORDS = [
  'netflix', 'spotify', 'hulu', 'disney', 'publix', 'kroger', 'trader joe',
  'whole foods', 'walmart grocery', 'target', 'costco wholesale', 'chick-fil-a',
  'mcdonald', 'starbucks', 'doordash', 'uber eats', 'lyft', 'shell', 'chevron',
  'atm', 'withdrawal', 'rent', 'mortgage', 'gym', 'daycare', 'school tuition',
  'phone bill', 'at&t', 'verizon', 't-mobile', 'child support'
]

const BUSINESS_ENTITY_REGEX = /\b(llc|inc|corp|co\b|company|services|service|solutions|realty|properties|property|hoa|management|group|studio|salon|contracting|transport|trucking)\b/i

const BUSINESS_VENDOR_KEYWORDS = [
  'home depot', 'lowes', 'restaurant depot', 'uline', 'grainger', 'sherwin',
  'ferguson', 'quill', 'staples', 'office depot', 'amazon business',
  'cleaning supply', 'janitorial', 'supply co', 'wholesale', 'costco business'
]

const INDUSTRY_KEYWORDS = {
  cleaning: ['clean', 'deep clean', 'move-out', 'move-in', 'janitorial', 'maid', 'rooms', 'weekly'],
  construction: ['construction', 'contractor', 'materials', 'lumber', 'tile', 'roof', 'paint', 'drywall'],
  restaurant: ['catering', 'restaurant', 'food order', 'supplier', 'produce', 'meat', 'wholesale'],
  landscaping: ['landscaping', 'lawn', 'yard', 'tree', 'mulch', 'maintenance'],
  childcare: ['childcare', 'daycare', 'after school', 'babysit', 'tuition'],
  trucking: ['dispatch', 'freight', 'load', 'broker', 'diesel', 'truck stop'],
  beauty: ['hair', 'salon', 'braid', 'barber', 'lashes', 'stylist'],
  retail: ['inventory', 'resale', 'boutique', 'shop', 'store']
}

const PERSONAL_CATEGORY_PRIMARY = new Set([
  'FOOD_AND_DRINK',
  'GENERAL_MERCHANDISE',
  'ENTERTAINMENT',
  'TRAVEL',
  'PERSONAL_CARE',
  'MEDICAL',
  'GENERAL_SERVICES'
])

const BUSINESS_FRIENDLY_CATEGORY_PRIMARY = new Set([
  'INCOME',
  'TRANSPORTATION',
  'RENT_AND_UTILITIES',
  'GENERAL_BUSINESS',
  'TRANSFER_IN',
  'TRANSFER_OUT'
])

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function safeLower(value) {
  return String(value || '').toLowerCase()
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function slugCounterparty(value) {
  return safeLower(value)
    .replace(/\b(zelle|venmo|cash app|payment|transfer|from|to|debit|credit|purchase|pos)\b/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCategory(raw) {
  if (raw?.personal_finance_category?.primary) {
    return {
      primary: raw.personal_finance_category.primary,
      detailed: raw.personal_finance_category.detailed || null,
    }
  }

  if (Array.isArray(raw?.category) && raw.category.length > 0) {
    return {
      primary: raw.category[0].replace(/\s+/g, '_').toUpperCase(),
      detailed: raw.category.slice(1).join(' > ') || null,
    }
  }

  return { primary: null, detailed: null }
}

function inferType(raw, description) {
  const desc = safeLower(description)
  const channel = safeLower(raw.payment_channel || raw.type)

  if (desc.includes('zelle')) return 'zelle'
  if (desc.includes('venmo')) return 'venmo'
  if (desc.includes('cash app')) return 'cash_app'
  if (desc.includes('atm') || desc.includes('cash')) return 'cash'
  if (channel.includes('online')) return 'online'
  if (channel.includes('in store')) return 'card'
  if (channel.includes('ach')) return 'ach'
  return safeLower(raw.transaction_type) || 'debit'
}

export function normalizeTransaction(raw, source = 'manual') {
  if (source !== 'plaid') {
    return {
      ...raw,
      merchantName: raw.merchantName || null,
      original: raw,
      source,
    }
  }

  const amount = Number(raw.amount || 0)
  const direction = amount < 0 ? 'in' : 'out'
  const signedAmount = direction === 'in' ? Math.abs(amount) : -Math.abs(amount)
  const description = raw.name || raw.merchant_name || 'Unknown transaction'
  const category = normalizeCategory(raw)
  const counterparties = Array.isArray(raw.counterparties)
    ? raw.counterparties.map((entry) => entry.name).filter(Boolean)
    : []

  return {
    id: raw.transaction_id,
    date: raw.authorized_date || raw.date,
    description,
    merchantName: raw.merchant_name || null,
    amount: signedAmount,
    direction,
    type: inferType(raw, description),
    category: category.primary,
    categoryDetailed: category.detailed,
    paymentChannel: raw.payment_channel || null,
    pending: Boolean(raw.pending),
    counterparties,
    accountId: raw.account_id,
    source: 'plaid',
    original: raw,
  }
}

function buildCounterpartyStats(transactions) {
  const stats = new Map()

  transactions.forEach((tx) => {
    const key = slugCounterparty(tx.merchantName || tx.counterparties?.[0] || tx.description)
    if (!key) return

    const current = stats.get(key) || {
      count: 0,
      inflowCount: 0,
      outflowCount: 0,
      inflowTotal: 0,
      outflowTotal: 0,
      amounts: [],
      dates: [],
      displayName: titleCase(tx.merchantName || tx.counterparties?.[0] || tx.description),
    }

    current.count += 1
    current.amounts.push(Math.abs(tx.amount))
    current.dates.push(tx.date)

    if (tx.direction === 'in') {
      current.inflowCount += 1
      current.inflowTotal += Math.abs(tx.amount)
    } else {
      current.outflowCount += 1
      current.outflowTotal += Math.abs(tx.amount)
    }

    stats.set(key, current)
  })

  return stats
}

function getIndustryKeywords(profile) {
  return INDUSTRY_KEYWORDS[profile?.industry] || []
}

function buildContext(transactions, profile) {
  const counterpartyStats = buildCounterpartyStats(transactions)

  return {
    profile,
    avgServicePrice: Number(profile?.avgServicePrice) || 0,
    ownerName: safeLower(profile?.ownerName),
    businessName: safeLower(profile?.businessName),
    accountType: profile?.accountType || 'shared',
    commonExpenses: (profile?.commonExpenseLabels || []).map(safeLower),
    industryKeywords: getIndustryKeywords(profile),
    counterpartyStats,
  }
}

function topReason(reasons) {
  return reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map((entry) => entry.label)
    .join(' + ')
}

function classifyTransactionWithContext(tx, context) {
  const description = safeLower(tx.description)
  const merchant = safeLower(tx.merchantName)
  const category = tx.category
  const detailed = safeLower(tx.categoryDetailed)
  const counterpartyKey = slugCounterparty(tx.merchantName || tx.counterparties?.[0] || tx.description)
  const stats = context.counterpartyStats.get(counterpartyKey)
  const absAmount = Math.abs(tx.amount)
  const isPeerPayment = ['zelle', 'venmo', 'cash_app'].includes(tx.type)

  let businessScore = 0
  let personalScore = 0
  let isGhost = false
  const reasons = []

  const addBusiness = (weight, label) => {
    businessScore += weight
    reasons.push({ weight, label })
  }

  const addPersonal = (weight, label) => {
    personalScore += weight
    reasons.push({ weight, label })
  }

  if (tx.type === 'zelle') {
    isGhost = true
    reasons.push({ weight: 16, label: 'Zelle activity has limited documentation compared with card or ACH rails' })
  }

  if (description.includes('atm') || description.includes('cash withdrawal') || tx.type === 'cash') {
    isGhost = true
    reasons.push({ weight: 18, label: 'Cash movement with limited digital audit trail' })
  }

  if (BUSINESS_ENTITY_REGEX.test(tx.description) || BUSINESS_ENTITY_REGEX.test(tx.merchantName)) {
    addBusiness(28, 'Counterparty looks like a registered business entity')
  }

  if (PERSONAL_KEYWORDS.some((keyword) => description.includes(keyword) || merchant.includes(keyword))) {
    addPersonal(30, 'Merchant pattern matches a common personal expense')
  }

  if (BUSINESS_VENDOR_KEYWORDS.some((keyword) => description.includes(keyword) || merchant.includes(keyword))) {
    addBusiness(24, 'Merchant is a common business supplier')
  }

  if (context.industryKeywords.some((keyword) => description.includes(keyword) || merchant.includes(keyword))) {
    addBusiness(20, `Description aligns with ${context.profile?.industry || 'business'} work`)
  }

  if (context.commonExpenses.some((keyword) => description.includes(keyword) || detailed.includes(keyword))) {
    addBusiness(16, 'Matches owner-declared business expense pattern')
  }

  if (context.businessName && (description.includes(context.businessName) || merchant.includes(context.businessName))) {
    addBusiness(18, 'Matches the business name')
  }

  if (context.ownerName && description.includes(context.ownerName)) {
    addPersonal(18, 'Counterparty matches the owner name')
  }

  if (tx.direction === 'in') {
    if (category === 'INCOME') {
      addBusiness(34, 'Plaid categorized this inflow as income')
    }

    if (isPeerPayment) {
      addBusiness(10, 'Peer payment rail is common for informal business revenue')
    }

    if (context.avgServicePrice > 0) {
      const withinServiceBand = absAmount >= context.avgServicePrice * 0.55 && absAmount <= context.avgServicePrice * 3.5
      if (withinServiceBand) {
        addBusiness(14, 'Amount fits the expected service ticket size')
      }
    }

    if (stats?.inflowCount >= 2) {
      addBusiness(14, 'Repeated inflows from this counterparty suggest a client relationship')
    }

    if (/transfer|savings|deposit|mobile deposit/i.test(tx.description) && !BUSINESS_ENTITY_REGEX.test(tx.description)) {
      addPersonal(14, 'Looks like an internal transfer rather than customer revenue')
    }
  }

  if (tx.direction === 'out') {
    if (PERSONAL_CATEGORY_PRIMARY.has(tx.category)) {
      addPersonal(24, 'Plaid category leans personal/consumer')
    }

    if (BUSINESS_FRIENDLY_CATEGORY_PRIMARY.has(tx.category)) {
      addBusiness(12, 'Plaid category can support business operations')
    }

    if (stats?.outflowCount >= 2 && BUSINESS_VENDOR_KEYWORDS.some((keyword) => description.includes(keyword) || merchant.includes(keyword))) {
      addBusiness(10, 'Repeated supplier spend strengthens the business classification')
    }

    if (/payroll|contractor|helper|assistant|labor|crew|dispatch/i.test(tx.description)) {
      addBusiness(24, 'Looks like labor or contractor expense')
    }

    if (/rent|mortgage/.test(description) && context.accountType === 'shared') {
      addPersonal(18, 'Housing payment on a mixed-use account is usually personal')
    }
  }

  if (context.accountType === 'business' && personalScore < 35) {
    addBusiness(8, 'Owner reported this as a business-only account')
  }

  const scoreGap = Math.abs(businessScore - personalScore)
  let classification = 'flagged'

  if (businessScore >= personalScore + 14) {
    classification = 'business'
  } else if (personalScore >= businessScore + 14) {
    classification = 'personal'
  }

  if (isGhost && classification === 'flagged' && tx.direction === 'out') {
    classification = 'personal'
  }

  const confidence = clamp(52 + scoreGap, 51, 98)
  const reason = topReason(reasons) || 'Insufficient evidence, needs review'

  return {
    ...tx,
    classification,
    confidence,
    reason,
    isGhost,
  }
}

export function classifyAll(transactions, profile = {}) {
  const normalized = transactions.map((tx) => {
    if (tx.source === 'plaid' && tx.original?.transaction_id) {
      return normalizeTransaction(tx.original, 'plaid')
    }
    if (tx.source === 'plaid' && tx.accountId) {
      return tx
    }
    return normalizeTransaction(tx, 'manual')
  })
  const context = buildContext(normalized, profile)
  return normalized.map((tx) => classifyTransactionWithContext(tx, context))
}

function monthKey(date) {
  return String(date || '').slice(0, 7)
}

function sum(list, mapper) {
  return list.reduce((total, item) => total + mapper(item), 0)
}

function average(list) {
  return list.length ? sum(list, (item) => item) / list.length : 0
}

function stdDev(list) {
  if (list.length <= 1) return 0
  const avg = average(list)
  const variance = average(list.map((item) => (item - avg) ** 2))
  return Math.sqrt(variance)
}

function buildMonthlyBuckets(classified) {
  const buckets = new Map()

  classified.forEach((tx) => {
    const key = monthKey(tx.date)
    const current = buckets.get(key) || { month: key, revenue: 0, expenses: 0 }
    if (tx.classification === 'business' && tx.direction === 'in') current.revenue += Math.abs(tx.amount)
    if (tx.classification === 'business' && tx.direction === 'out') current.expenses += Math.abs(tx.amount)
    buckets.set(key, current)
  })

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month))
}

function buildVerifiedRelationships(classified) {
  const incomingBusiness = classified.filter((tx) => tx.classification === 'business' && tx.direction === 'in')
  const grouped = new Map()

  incomingBusiness.forEach((tx) => {
    const key = slugCounterparty(tx.merchantName || tx.counterparties?.[0] || tx.description)
    if (!key) return
    const current = grouped.get(key) || {
      name: titleCase(tx.merchantName || tx.counterparties?.[0] || tx.description),
      count: 0,
      total: 0,
    }
    current.count += 1
    current.total += Math.abs(tx.amount)
    grouped.set(key, current)
  })

  return Array.from(grouped.values())
    .filter((entry) => entry.count >= 2 || BUSINESS_ENTITY_REGEX.test(entry.name))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
}

export function buildCashflowReport(classified, profile = {}) {
  const business = classified.filter((t) => t.classification === 'business')
  const personal = classified.filter((t) => t.classification === 'personal')
  const flagged = classified.filter((t) => t.classification === 'flagged')
  const ghost = classified.filter((t) => t.isGhost)

  const bizRevenue = sum(business.filter((t) => t.direction === 'in'), (t) => Math.abs(t.amount))
  const bizExpenses = sum(business.filter((t) => t.direction === 'out'), (t) => Math.abs(t.amount))
  const personalOutflows = sum(personal.filter((t) => t.direction === 'out'), (t) => Math.abs(t.amount))
  const ghostTotal = sum(ghost, (t) => Math.abs(t.amount))
  const totalOut = sum(classified.filter((t) => t.direction === 'out'), (t) => Math.abs(t.amount))
  const netCashflow = bizRevenue - bizExpenses

  const monthly = buildMonthlyBuckets(classified)
  const monthsObserved = Math.max(1, monthly.length)
  const monthlyRevenueSeries = monthly.map((entry) => entry.revenue)
  const avgMonthlyRevenue = bizRevenue / monthsObserved
  const avgMonthlyExpenses = bizExpenses / monthsObserved
  const avgMonthlyFree = netCashflow / monthsObserved
  const revenueVolatility = avgMonthlyRevenue > 0 ? stdDev(monthlyRevenueSeries) / avgMonthlyRevenue : 1
  const marginRatio = bizRevenue > 0 ? netCashflow / bizRevenue : 0
  const classificationCoverage = classified.length > 0 ? (business.length + personal.length) / classified.length : 0
  const flaggedRatio = classified.length > 0 ? flagged.length / classified.length : 1
  const ghostRatio = totalOut > 0 ? ghostTotal / totalOut : 0
  const personalMixRatio = totalOut > 0 ? personalOutflows / totalOut : 0
  const distinctClients = new Set(
    business
      .filter((tx) => tx.direction === 'in')
      .map((tx) => slugCounterparty(tx.merchantName || tx.counterparties?.[0] || tx.description))
      .filter(Boolean)
  ).size

  const scoreBreakdown = {
    revenueConsistency: clamp(Math.round((1 - Math.min(revenueVolatility, 1.2) / 1.2) * 30), 0, 30),
    cashFlowHealth: clamp(Math.round(((marginRatio + 0.1) / 0.6) * 25), 0, 25),
    separationDiscipline: clamp(Math.round((classificationCoverage - flaggedRatio - personalMixRatio * 0.35) * 20), 0, 20),
    clientDiversity: clamp(distinctClients * 2, 0, 10),
    operatingHistory: clamp(Number(profile?.yearsOperating || 0) * 2, 0, 5),
    evidenceQuality: clamp(Math.round((business.length / Math.max(classified.length, 1)) * 10 - ghostRatio * 8), 0, 10),
  }

  const reliabilityScore = clamp(
    scoreBreakdown.revenueConsistency +
      scoreBreakdown.cashFlowHealth +
      scoreBreakdown.separationDiscipline +
      scoreBreakdown.clientDiversity +
      scoreBreakdown.operatingHistory +
      scoreBreakdown.evidenceQuality,
    0,
    100
  )

  const debtCapacity = Math.max(0, Math.round(avgMonthlyFree * 0.3))
  const loanMin = Math.max(0, Math.round((debtCapacity * 16) / 1000) * 1000)
  const loanMax = Math.max(0, Math.round((debtCapacity * 28) / 1000) * 1000)
  const revenueVolatilityPercent = Math.round(revenueVolatility * 100)
  const classificationCoveragePercent = Math.round(classificationCoverage * 100)
  const flaggedRatioPercent = Math.round(flaggedRatio * 100)
  const ghostRatioPercent = Math.round(ghostRatio * 100)
  const personalMixRatioPercent = Math.round(personalMixRatio * 100)
  const businessSharePercent = classified.length > 0
    ? Math.round((business.length / classified.length) * 100)
    : 0

  return {
    bizRevenue: Math.round(bizRevenue),
    bizExpenses: Math.round(bizExpenses),
    netCashflow: Math.round(netCashflow),
    personalOutflows: Math.round(personalOutflows),
    ghostTotal: Math.round(ghostTotal),
    monthlyRevenue: Math.round(avgMonthlyRevenue),
    monthlyExpenses: Math.round(avgMonthlyExpenses),
    monthlyFree: Math.round(avgMonthlyFree),
    debtCapacity,
    loanMin,
    loanMax,
    reliabilityScore,
    marginPercent: Math.round(marginRatio * 100),
    dti: bizRevenue > 0 ? Math.round((bizExpenses / bizRevenue) * 100) : 0,
    monthsObserved,
    distinctClients,
    scoreBreakdown,
    factorSummary: {
      revenueVolatilityPercent,
      classificationCoveragePercent,
      flaggedRatioPercent,
      ghostRatioPercent,
      personalMixRatioPercent,
      businessSharePercent,
      yearsOperating: Number(profile?.yearsOperating || 0),
      marginPercent: Math.round(marginRatio * 100),
    },
    verifiedRelationships: buildVerifiedRelationships(classified),
    monthlyTrend: monthly,
    counts: {
      total: classified.length,
      business: business.length,
      personal: personal.length,
      flagged: flagged.length,
      ghost: ghost.length,
    },
  }
}

export function buildNarrative(profile, report, classified, lang = 'en', audience = 'owner') {
  const clientNames = report.verifiedRelationships.map((entry) => entry.name).slice(0, 3)
  const topEvidence = clientNames.length > 0 ? clientNames.join(', ') : (lang === 'es' ? 'clientes recurrentes' : 'recurring customers')

  if (lang === 'es' && audience === 'owner') {
    return [
      `${profile.businessName || profile.ownerName} muestra aproximadamente $${report.monthlyRevenue.toLocaleString()} en ingresos mensuales de negocio y $${report.monthlyFree.toLocaleString()} en flujo libre, basado en ${report.counts.total} transacciones revisadas durante ${report.monthsObserved} meses. Encontramos evidencia repetida de ingresos de negocio a través de ${topEvidence}, lo cual fortalece la historia financiera del negocio.`,
      `El Fundo Rating actual es ${report.reliabilityScore}/100. Los factores que más ayudan son la consistencia de ingresos y el margen operativo; los principales riesgos siguen siendo ${report.counts.flagged} transacciones que necesitan revisión manual y $${report.ghostTotal.toLocaleString()} en movimientos de efectivo con poca trazabilidad. Con el flujo actual, la capacidad estimada de pago es de $${report.debtCapacity.toLocaleString()} por mes, lo que respalda un rango aproximado de préstamo de $${report.loanMin.toLocaleString()} a $${report.loanMax.toLocaleString()}.`,
      `Recomendación: presentar este reporte junto con recibos, facturas o capturas de pago para las transacciones marcadas. Si reduces el uso mixto personal/negocio y mantienes ingresos similares por 2 o 3 meses más, el perfil debería fortalecerse de forma clara ante un prestamista comunitario o CDFI.`,
    ].join('\n\n')
  }

  if (audience === 'bank') {
    return [
      `${profile.businessName || profile.ownerName} demonstrates estimated monthly business revenue of $${report.monthlyRevenue.toLocaleString()} and monthly free cash flow of $${report.monthlyFree.toLocaleString()} based on ${report.counts.total} reviewed transactions across ${report.monthsObserved} months. Revenue evidence is supported by recurring counterparties such as ${topEvidence}.`,
      `The current Fundalo reliability score is ${report.reliabilityScore}/100, driven primarily by revenue consistency, operating margin, and transaction evidence quality. Key weaknesses are ${report.counts.flagged} transactions still requiring manual validation and $${report.ghostTotal.toLocaleString()} in cash-like movements with limited traceability. Estimated debt service capacity is $${report.debtCapacity.toLocaleString()} per month, supporting an indicative loan range of $${report.loanMin.toLocaleString()} to $${report.loanMax.toLocaleString()}.`,
      `Recommendation: conditionally lend only with corroborating documents for flagged inflows/outflows and continued account monitoring. The business profile strengthens materially if mixed personal spending declines and the current revenue cadence persists.`,
    ].join('\n\n')
  }

  return [
    `${profile.businessName || profile.ownerName} shows about $${report.monthlyRevenue.toLocaleString()} in average monthly business revenue and $${report.monthlyFree.toLocaleString()} in monthly free cash flow from ${report.counts.total} reviewed transactions over ${report.monthsObserved} months. The strongest evidence comes from recurring business-like payments from ${topEvidence}.`,
    `The current Fundo score is ${report.reliabilityScore}/100. Revenue consistency and cash flow health are helping the profile, while ${report.counts.flagged} transactions still need review and $${report.ghostTotal.toLocaleString()} is tied to cash-style activity with weaker auditability. Based on current cash flow, estimated debt capacity is $${report.debtCapacity.toLocaleString()} per month and the supportable loan range is roughly $${report.loanMin.toLocaleString()} to $${report.loanMax.toLocaleString()}.`,
    `Recommendation: pair this report with invoices, screenshots, or receipts for the flagged items and continue reducing personal/business commingling. A few additional months of similar deposits should make the credit story notably stronger.`,
  ].join('\n\n')
}
