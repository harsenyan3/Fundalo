function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

const CATALOG = [
  {
    id: 'sba-microloan',
    type: 'loan',
    title: 'SBA Microloan',
    titleEs: 'Microprestamo SBA',
    provider: 'U.S. Small Business Administration',
    url: 'https://www.sba.gov/funding-programs/loans/microloans',
    summary: 'A direct microloan program page for smaller working-capital needs through SBA intermediaries.',
    summaryEs: 'Pagina directa del programa de microprestamos para necesidades pequenas de capital de trabajo a traves de intermediarios SBA.',
  },
  {
    id: 'sba-7a-small',
    type: 'loan',
    title: 'SBA 7(a) Small Loan',
    titleEs: 'Prestamo pequeno SBA 7(a)',
    provider: 'U.S. Small Business Administration',
    url: 'https://www.sba.gov/partners/lenders/7a-loan-program/types-7a-loans',
    summary: 'A specific SBA 7(a) loan track for general business financing, working capital, and growth.',
    summaryEs: 'Una ruta especifica del prestamo SBA 7(a) para capital de trabajo, operacion y crecimiento.',
  },
  {
    id: 'sba-504',
    type: 'loan',
    title: 'SBA 504 Loan',
    titleEs: 'Prestamo SBA 504',
    provider: 'U.S. Small Business Administration',
    url: 'https://www.sba.gov/funding-programs/loans/504-loans',
    summary: 'A specific long-term fixed-asset loan page for equipment, vehicles, and owner-occupied property.',
    summaryEs: 'Una pagina especifica de prestamo de largo plazo para activos fijos como equipo, vehiculos y propiedad ocupada por el negocio.',
  },
  {
    id: 'sba-step',
    type: 'grant',
    title: 'State Trade Expansion Program (STEP)',
    titleEs: 'State Trade Expansion Program (STEP)',
    provider: 'U.S. Small Business Administration',
    url: 'https://www.sba.gov/funding-programs/grants/state-trade-expansion-program-step',
    summary: 'A specific export-growth grant pathway administered through state partners for businesses entering new markets.',
    summaryEs: 'Una ruta especifica de grant para crecimiento exportador administrada por socios estatales para negocios que entran a nuevos mercados.',
  },
  {
    id: 'score-funding-webinar',
    type: 'support',
    title: 'SCORE: Loans, Grants and Other Funding Options',
    titleEs: 'SCORE: Prestamos, grants y otras opciones de financiamiento',
    provider: 'SCORE',
    url: 'https://academy.score.org/course/loans-grants-and-other-funding-options',
    summary: 'A specific SCORE course focused on comparing loans, grants, crowdfunding, and other capital paths.',
    summaryEs: 'Un curso especifico de SCORE enfocado en comparar prestamos, grants, crowdfunding y otras rutas de capital.',
  },
  {
    id: 'score-alt-funding',
    type: 'support',
    title: 'SCORE: How to Fund Your Business Without a Loan',
    titleEs: 'SCORE: Como financiar tu negocio sin un prestamo',
    provider: 'SCORE',
    url: 'https://academy.score.org/course/how-to-fund-your-business-without-a-loan-alternative-funding-sources',
    summary: 'A specific SCORE course on alternative funding sources like grants, crowdfunding, and non-bank capital.',
    summaryEs: 'Un curso especifico de SCORE sobre fuentes alternativas de financiamiento como grants, crowdfunding y capital no bancario.',
  },
]

function getAssetValue(profile) {
  if (profile?.totalEstimatedAssetValue) return Number(profile.totalEstimatedAssetValue) || 0
  if (!Array.isArray(profile?.assets)) return 0
  return profile.assets.reduce((sum, asset) => sum + (Number(asset?.estimatedValue) || 0), 0)
}

function buildReasons(opportunity, profile, report, es) {
  const reasons = []
  const score = report?.reliabilityScore || 0
  const monthlyRevenue = report?.monthlyRevenue || 0
  const loanMax = report?.loanMax || 0
  const yearsOperating = Number(profile?.yearsOperating || 0)
  const flaggedRatio = report?.factorSummary?.flaggedRatioPercent || 0
  const assetValue = getAssetValue(profile)
  const industry = profile?.industry

  if (opportunity.id === 'sba-microloan') {
    if (loanMax <= 50000) reasons.push(es ? 'Tu rango estimado de capital sigue siendo pequeno' : 'Your estimated capital need is still on the smaller side')
    if (yearsOperating < 3) reasons.push(es ? 'Los negocios tempranos suelen encajar mejor en esta ruta' : 'Early-stage businesses often fit this path better')
    if (score >= 45) reasons.push(es ? 'Ya hay senales basicas de capacidad de repago' : 'There are already baseline repayment signals in the report')
  }

  if (opportunity.id === 'sba-7a-small') {
    if (score >= 60) reasons.push(es ? 'Tu Fundo report ya se ve lo bastante estructurado para una solicitud formal' : 'Your Fundo report already looks structured enough for a formal application')
    if (monthlyRevenue >= 5000) reasons.push(es ? 'Tus ingresos mensuales ya respaldan una conversacion de crecimiento o capital de trabajo' : 'Your monthly revenue already supports a growth or working-capital conversation')
    if (flaggedRatio <= 25) reasons.push(es ? 'La porcion de transacciones dudosas se mantiene controlada' : 'The share of ambiguous transactions is still manageable')
  }

  if (opportunity.id === 'sba-504') {
    if (assetValue >= 15000) reasons.push(es ? 'Ya declaraste activos que fortalecen una historia de financiamiento fijo' : 'You already declared assets that support a fixed-asset financing story')
    if (['construction', 'trucking', 'restaurant', 'retail', 'cleaning', 'beauty'].includes(industry)) {
      reasons.push(es ? 'Tu industria normalmente opera con equipo o activos productivos financiables' : 'Your industry often runs on financeable equipment or productive assets')
    }
    if (score >= 65) reasons.push(es ? 'Tu perfil ya muestra una base operativa relativamente estable' : 'Your profile already shows a relatively stable operating base')
  }

  if (opportunity.id === 'sba-step') {
    if (monthlyRevenue >= 5000) reasons.push(es ? 'Ya existe una base comercial para explorar expansion a otros mercados' : 'There is already enough commercial base to explore expansion into new markets')
    if (yearsOperating >= 1) reasons.push(es ? 'La etapa actual del negocio ya permite pensar en expansion' : 'The current stage of the business supports an expansion conversation')
    if (['retail', 'beauty', 'restaurant', 'construction', 'trucking'].includes(industry)) {
      reasons.push(es ? 'Tu negocio puede beneficiarse de apoyo para crecimiento comercial o exportador' : 'Your business may benefit from support tied to commercial or export growth')
    }
  }

  if (opportunity.id === 'score-funding-webinar') {
    if (score < 75) reasons.push(es ? 'Todavia vale la pena comparar rutas antes de enviar solicitudes' : 'It still makes sense to compare funding paths before submitting applications')
    if (loanMax > 0) reasons.push(es ? 'Ya tienes un rango estimado que te ayuda a comparar opciones' : 'You already have an estimated range that helps compare options')
    if (flaggedRatio > 10) reasons.push(es ? 'Una revision guiada puede ayudarte a ordenar la historia financiera' : 'A guided review can help you tighten the financial story')
  }

  if (opportunity.id === 'score-alt-funding') {
    if (score < 65) reasons.push(es ? 'Todavia conviene explorar capital alternativo antes de endeudarte' : 'It still makes sense to explore alternative capital before taking on debt')
    if (flaggedRatio > 15) reasons.push(es ? 'Si la historia financiera aun esta en construccion, las rutas no bancarias pueden ser mas realistas' : 'If the financial story is still being cleaned up, non-bank routes may be more realistic')
    if (yearsOperating < 2) reasons.push(es ? 'Las empresas mas nuevas suelen beneficiarse de estrategias de capital mas creativas' : 'Newer businesses often benefit from more creative capital strategies')
  }

  return reasons.slice(0, 2)
}

function scoreOpportunity(opportunity, profile, report) {
  const score = report?.reliabilityScore || 0
  const monthlyRevenue = report?.monthlyRevenue || 0
  const monthlyFree = report?.monthlyFree || 0
  const yearsOperating = Number(profile?.yearsOperating || 0)
  const flaggedRatio = report?.factorSummary?.flaggedRatioPercent || 0
  const ghostRatio = report?.factorSummary?.ghostRatioPercent || 0
  const loanMax = report?.loanMax || 0
  const assetValue = getAssetValue(profile)
  const industry = profile?.industry

  let fit = 0

  if (opportunity.id === 'sba-microloan') {
    if (loanMax > 0 && loanMax <= 50000) fit += 35
    if (score >= 45) fit += 20
    if (yearsOperating < 3) fit += 10
    if (monthlyRevenue > 0 && monthlyRevenue < 15000) fit += 10
    if (flaggedRatio <= 35) fit += 5
  }

  if (opportunity.id === 'sba-7a-small') {
    if (score >= 60) fit += 30
    if (loanMax >= 25000 && loanMax <= 350000) fit += 25
    if (monthlyRevenue >= 5000) fit += 15
    if (yearsOperating >= 1) fit += 10
    if (flaggedRatio <= 25) fit += 10
    if (ghostRatio <= 25) fit += 5
  }

  if (opportunity.id === 'sba-504') {
    if (score >= 65) fit += 25
    if (assetValue >= 15000) fit += 25
    if (loanMax >= 50000) fit += 10
    if (['construction', 'trucking', 'restaurant', 'retail', 'cleaning', 'beauty'].includes(industry)) fit += 15
    if (yearsOperating >= 2) fit += 10
  }

  if (opportunity.id === 'sba-step') {
    if (monthlyRevenue >= 5000) fit += 20
    if (yearsOperating >= 1) fit += 15
    if (score >= 50) fit += 10
    if (['retail', 'beauty', 'restaurant', 'construction', 'trucking'].includes(industry)) fit += 15
    if (monthlyFree > 0) fit += 10
  }

  if (opportunity.id === 'score-funding-webinar') {
    if (score < 75) fit += 25
    if (loanMax > 0) fit += 15
    if (flaggedRatio > 10) fit += 15
    if (yearsOperating < 3) fit += 10
  }

  if (opportunity.id === 'score-alt-funding') {
    if (score < 65) fit += 30
    if (flaggedRatio > 15) fit += 20
    if (ghostRatio > 10) fit += 10
    if (yearsOperating < 2) fit += 15
  }

  return clamp(fit, 0, 100)
}

export function buildOpportunityRecommendations(profile, report, lang = 'en') {
  const es = lang === 'es'

  return CATALOG
    .map((opportunity) => ({
      ...opportunity,
      titleLocalized: es ? opportunity.titleEs : opportunity.title,
      summaryLocalized: es ? opportunity.summaryEs : opportunity.summary,
      reasons: buildReasons(opportunity, profile, report, es),
      sortScore: scoreOpportunity(opportunity, profile, report),
    }))
    .filter((opportunity) => opportunity.sortScore >= 35)
    .sort((a, b) => b.sortScore - a.sortScore)
    .slice(0, 4)
}
