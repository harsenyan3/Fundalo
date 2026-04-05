import { useEffect, useMemo, useState } from 'react'
import { classifyAll, buildCashflowReport } from '../lib/classifier.js'
import { analyzePlaidAccount } from '../lib/api.js'
import { openPlaidLink } from '../lib/plaidLink.js'
import styles from './Dashboard.module.css'

const FILTERS = ['all', 'business', 'personal', 'flagged', 'ghost']

const FundaloLogo = () => (
  <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
    <path d="M40 40 C40 40 40 10 80 10 C120 10 140 40 140 70 C140 100 110 110 80 110 L40 110 Z" fill="#1a2340"/>
    <path d="M40 110 L40 160 C40 160 40 190 70 190 C100 190 110 165 110 150 C110 135 95 110 80 110 Z" fill="#1a2340"/>
    <circle cx="148" cy="158" r="28" fill="#2ec4a0"/>
  </svg>
)

function buildAnalysisProfile(profile) {
  const {
    prefetchedAnalysis,
    plaidMeta,
    assetInput,
    manualType,
    manualDirection,
    manualAmount,
    manualDate,
    manualDescription,
    ...rest
  } = profile

  return rest
}

function getInitialSource(profile) {
  if (profile?.prefetchedAnalysis?.classified) return 'plaid'
  if (Array.isArray(profile?.manualTransactions) && profile.manualTransactions.length > 0) return 'manual'
  return 'empty'
}

function applyOverrides(transactions, overrides) {
  return transactions.map((tx) =>
    overrides[tx.id]
      ? { ...tx, classification: overrides[tx.id], confidence: 100, reason: 'Manually confirmed' }
      : tx
  )
}

function translateType(type, es) {
  if (!es) return String(type || '').toUpperCase()

  const map = {
    cash: 'EFECTIVO',
    zelle: 'ZELLE',
    ach: 'ACH',
    card: 'TARJETA',
    online: 'EN LINEA',
    debit: 'DEBITO',
    cash_app: 'CASH APP',
    venmo: 'VENMO',
  }

  return map[type] || String(type || '').toUpperCase()
}

function translateReason(reason, es) {
  if (!es) return reason

  const map = {
    'Manually confirmed': 'Confirmado manualmente',
    'Cash movement with limited digital audit trail': 'Movimiento en efectivo con trazabilidad digital limitada',
    'Counterparty looks like a registered business entity': 'La contraparte parece una entidad comercial registrada',
    'Merchant pattern matches a common personal expense': 'El comercio coincide con un gasto personal comun',
    'Merchant is a common business supplier': 'El comercio es un proveedor comun del negocio',
    'Matches owner-declared business expense pattern': 'Coincide con un gasto de negocio declarado por el usuario',
    'Matches the business name': 'Coincide con el nombre del negocio',
    'Counterparty matches the owner name': 'La contraparte coincide con el nombre del dueño',
    'Plaid categorized this inflow as income': 'Plaid clasifico este ingreso como ingreso de negocio',
    'Peer payment rail is common for informal business revenue': 'Este rail de pago es comun para ingresos de negocio informales',
    'Amount fits the expected service ticket size': 'El monto coincide con el precio esperado del servicio',
    'Repeated inflows from this counterparty suggest a client relationship': 'Ingresos repetidos de esta contraparte sugieren una relacion con cliente',
    'Looks like an internal transfer rather than customer revenue': 'Parece una transferencia interna y no ingreso de cliente',
    'Plaid category leans personal/consumer': 'La categoria de Plaid se inclina a consumo personal',
    'Plaid category can support business operations': 'La categoria de Plaid puede respaldar operaciones del negocio',
    'Repeated supplier spend strengthens the business classification': 'Gastos repetidos con proveedor fortalecen la clasificacion de negocio',
    'Looks like labor or contractor expense': 'Parece gasto de mano de obra o contratista',
    'Housing payment on a mixed-use account is usually personal': 'Pago de vivienda en cuenta mixta suele ser personal',
    'Owner reported this as a business-only account': 'El usuario reporto esta cuenta como solo de negocio',
    'Insufficient evidence, needs review': 'Evidencia insuficiente, necesita revision',
  }

  const dynamic = reason?.replace(/^Description aligns with (.+) work$/, 'La descripcion coincide con actividad de $1')
  if (dynamic && dynamic !== reason) return dynamic

  return map[reason] || reason
}

export default function Dashboard({ profile, lang, setLang, onContinue, onBack }) {
  const [filter, setFilter] = useState('all')
  const [overrides, setOverrides] = useState({})
  const [source, setSource] = useState(() => getInitialSource(profile))
  const [plaidSessionId, setPlaidSessionId] = useState(profile?.plaidSessionId || null)
  const [plaidAnalysis, setPlaidAnalysis] = useState(profile?.prefetchedAnalysis || null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const es = lang === 'es'

  const baseClassified = useMemo(() => {
    if (source === 'plaid' && plaidAnalysis?.classified) {
      return plaidAnalysis.classified
    }
    if (Array.isArray(profile?.manualTransactions) && profile.manualTransactions.length > 0) {
      return classifyAll(profile.manualTransactions, profile)
    }
    return []
  }, [plaidAnalysis, profile, source])

  const classified = useMemo(() => applyOverrides(baseClassified, overrides), [baseClassified, overrides])
  const report = useMemo(() => buildCashflowReport(classified, profile), [classified, profile])

  const filtered = filter === 'ghost'
    ? classified.filter(t => t.isGhost)
    : filter === 'all'
      ? classified
      : classified.filter(t => t.classification === filter)

  function override(id, classification) {
    setOverrides(p => ({ ...p, [id]: classification }))
  }

  useEffect(() => {
    const manualCount = Array.isArray(profile?.manualTransactions) ? profile.manualTransactions.length : 0
    const analyzedManualCount = plaidAnalysis?.meta?.manualTransactionCount || 0

    if (profile?.plaidSessionId && (!plaidAnalysis?.classified || manualCount !== analyzedManualCount)) {
      syncPlaidAnalysis(profile.plaidSessionId)
    }
  }, [plaidAnalysis, profile?.manualTransactions, profile?.plaidSessionId])

  async function syncPlaidAnalysis(sessionId = plaidSessionId) {
    if (!sessionId) return
    setSyncError('')
    setSyncing(true)

    try {
      const result = await analyzePlaidAccount({ sessionId, profile: buildAnalysisProfile(profile), days: 180 })
      setPlaidSessionId(sessionId)
      setPlaidAnalysis(result)
      setSource('plaid')
      setOverrides({})
    } catch (error) {
      setSyncError(error.message)
    } finally {
      setSyncing(false)
    }
  }

  async function handlePlaidConnect() {
    setSyncError('')
    setSyncing(true)
    try {
      const exchange = await openPlaidLink(profile)
      if (!exchange?.sessionId) {
        setSyncing(false)
        return
      }
      await syncPlaidAnalysis(exchange.sessionId)
    } catch (error) {
      setSyncError(error.message)
      setSyncing(false)
    }
  }

  const hasAnyData = classified.length > 0

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button className={styles.backBtn} onClick={onBack}>← {es ? 'Atrás' : 'Back'}</button>
          <div className={styles.logo}>
            <FundaloLogo />
            <span className={styles.logoText}>Fundalo</span>
          </div>
        </div>
        <div className={styles.langToggle}>
          <button className={lang === 'en' ? styles.langActive : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? styles.langActive : ''} onClick={() => setLang('es')}>ES</button>
        </div>
      </div>

      {source !== 'plaid' && (
        <div className={styles.plaidBanner}>
          <div className={styles.plaidLeft}>
            <div className={styles.plaidIcon}>🏦</div>
            <div>
              <div className={styles.plaidTitle}>
                {es ? 'Conecta tu banco para datos reales' : 'Connect your bank for real data'}
              </div>
              <div className={styles.plaidSub}>
                {es
                  ? 'Conecta con Plaid para importar transacciones reales. También usaremos tus entradas manuales.'
                  : 'Connect with Plaid to import real transactions. Your manual entries will be included too.'}
              </div>
            </div>
          </div>
          <button
            className={styles.plaidBtn}
            onClick={handlePlaidConnect}
            disabled={syncing}>
            {syncing
              ? (es ? 'Conectando...' : 'Connecting...')
              : source === 'manual'
                ? (es ? '🔗 Conectar Plaid' : '🔗 Connect Plaid')
                : (es ? '🔗 Conectar banco' : '🔗 Connect bank')}
          </button>
        </div>
      )}

      {source === 'plaid' && (
        <div className={styles.plaidSuccess}>
          ✓ {es ? 'Banco conectado vía Plaid — mostrando transacciones reales' : 'Bank connected via Plaid — showing real transactions'}
        </div>
      )}

      {syncError && (
        <div className={styles.plaidBanner} style={{ background: '#fff5f5', borderColor: '#fecaca' }}>
          <div>
            <div className={styles.plaidTitle} style={{ color: '#b91c1c' }}>{es ? 'Error de conexión' : 'Connection error'}</div>
            <div className={styles.plaidSub} style={{ color: '#7f1d1d' }}>{syncError}</div>
          </div>
        </div>
      )}

      <div className={styles.ownerRow}>
        <div>
          <h1 className={styles.ownerName}>{profile.businessName || profile.ownerName}</h1>
          <p className={styles.ownerSub}>
            {es ? 'Analisis de flujo de caja' : 'Cash flow analysis'} · {es ? 'Ultimos 180 dias' : 'Last 180 days'}
          </p>
        </div>
        <div className={styles.scorePill}>
          <span className={styles.scoreNum}>{report.reliabilityScore}</span>
          <span className={styles.scoreLabel}>{es ? 'Puntaje' : 'Score'}</span>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>{es ? 'Ingresos negocio' : 'Business revenue'}</div>
          <div className={styles.metricVal} style={{ color: 'var(--teal)' }}>${report.bizRevenue.toLocaleString()}</div>
          <div className={styles.metricSub}>${report.monthlyRevenue.toLocaleString()}{es ? '/mes' : '/mo avg'}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>{es ? 'Gastos negocio' : 'Business expenses'}</div>
          <div className={styles.metricVal} style={{ color: 'var(--danger)' }}>${report.bizExpenses.toLocaleString()}</div>
          <div className={styles.metricSub}>${report.monthlyExpenses.toLocaleString()}{es ? '/mes' : '/mo avg'}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>{es ? 'Flujo libre' : 'Free cash flow'}</div>
          <div className={styles.metricVal} style={{ color: 'var(--navy)' }}>${report.monthlyFree.toLocaleString()}<span style={{ fontSize: 13, fontWeight: 600 }}>/mo</span></div>
          <div className={styles.metricSub}>{es ? 'Capacidad deuda' : 'Debt capacity'}: ${report.debtCapacity.toLocaleString()}/mo</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>{es ? '"Dinero fantasma"' : '"Ghost money"'}</div>
          <div className={styles.metricVal} style={{ color: '#7c3aed' }}>${report.ghostTotal.toLocaleString()}</div>
          <div className={styles.metricSub}>{es ? 'Efectivo sin rastrear' : 'Untracked cash outflows'}</div>
        </div>
      </div>

      <div className={styles.loanBox}>
        <div>
          <div className={styles.loanLabel}>{es ? 'Rango de préstamo estimado' : 'Estimated loan range'}</div>
          <div className={styles.loanRange}>${report.loanMin.toLocaleString()} – ${report.loanMax.toLocaleString()}</div>
        </div>
        <div className={styles.dti}>
          <div className={styles.dtiLabel}>DTI</div>
          <div className={styles.dtiVal}>{report.dti}%</div>
        </div>
      </div>

      <div className={styles.txSection}>
        <div className={styles.txHeader}>
          <div className={styles.txTitle}>{es ? 'Transacciones' : 'Transactions'}</div>
          <div className={styles.counts}>
            <span className="tag tag-business">{report.counts.business} {es ? 'negocio' : 'business'}</span>
            <span className="tag tag-personal">{report.counts.personal} {es ? 'personal' : 'personal'}</span>
            <span className="tag tag-flagged">{report.counts.flagged} {es ? 'revisar' : 'review'}</span>
            <span className="tag tag-ghost">{report.counts.ghost} {es ? 'fantasma' : 'ghost'}</span>
          </div>
        </div>

        <div className={styles.filterRow}>
          {FILTERS.map(f => (
            <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? (es ? 'Todas' : 'All')
                : f === 'business' ? (es ? 'Negocio' : 'Business')
                : f === 'personal' ? 'Personal'
                : f === 'flagged' ? (es ? 'Revisar' : 'Review')
                : (es ? 'Fantasma' : 'Ghost')}
            </button>
          ))}
        </div>

        {!hasAnyData ? (
          <div className={styles.plaidBanner}>
            <div>
              <div className={styles.plaidTitle}>{es ? 'Todavía no hay transacciones' : 'No transactions yet'}</div>
              <div className={styles.plaidSub}>
                {es
                  ? 'Conecta Plaid o agrega movimientos manuales en la encuesta para generar el análisis.'
                  : 'Connect Plaid or add manual entries in intake to generate the analysis.'}
              </div>
            </div>
          </div>
        ) : (
        <div className={styles.txList}>
          {filtered.map(tx => (
            <div key={tx.id} className={`${styles.txRow} ${tx.isGhost ? styles.txGhost : ''}`}>
              <div className={styles.txLeft}>
                <div className={styles.txDesc}>
                  {tx.description}
                </div>
                <div className={styles.txMeta}>
                  {tx.date} · {translateType(tx.type, es)}
                  {tx.reason && <span className={styles.txReason}> · {translateReason(tx.reason, es)}</span>}
                </div>
              </div>
              <div className={styles.txRight}>
                <div className={`${styles.txAmount} ${tx.direction === 'in' ? styles.amountIn : styles.amountOut}`}>
                  {tx.direction === 'in' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                </div>
                <div className={styles.txActions}>
                  {tx.isGhost
                    ? <span className="tag tag-ghost">{es ? 'Fantasma' : 'Ghost'}</span>
                    : tx.classification === 'flagged'
                      ? (
                        <div className={styles.flagActions}>
                          <button className={styles.confirmBiz} onClick={() => override(tx.id, 'business')}>
                            {es ? 'Negocio' : 'Business'}
                          </button>
                          <button className={styles.confirmPersonal} onClick={() => override(tx.id, 'personal')}>
                            {es ? 'Personal' : 'Personal'}
                          </button>
                        </div>
                      )
                      : <span className={`tag tag-${tx.classification}`}>
                          {tx.classification === 'business' ? (es ? 'Negocio' : 'Business') : 'Personal'}
                        </span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <button className="btn-primary" onClick={() => onContinue(report, classified)} style={{ marginTop: '2rem' }}>
        {es ? 'Generar mi Fundo Rating →' : 'Generate my Fundo Rating →'}
      </button>
    </div>
  )
}
