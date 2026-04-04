import { useState, useMemo } from 'react'
import { classifyAll, buildCashflowReport } from '../lib/classifier.js'
import { MOCK_TRANSACTIONS, KNOWN_BUSINESS_ACCOUNTS } from '../data/mockTransactions.js'
import styles from './Dashboard.module.css'

const FILTERS = ['all', 'business', 'personal', 'flagged', 'ghost']

export default function Dashboard({ profile, onContinue }) {
  const [filter, setFilter] = useState('all')
  const [lang, setLang] = useState('en')
  const [overrides, setOverrides] = useState({})
  const es = lang === 'es'

  const classified = useMemo(() => {
    const base = classifyAll(MOCK_TRANSACTIONS, profile)
    return base.map(tx => overrides[tx.id]
      ? { ...tx, classification: overrides[tx.id], confidence: 100, reason: 'Manually confirmed' }
      : tx
    )
  }, [profile, overrides])

  const report = useMemo(() => buildCashflowReport(classified), [classified])

  const filtered = filter === 'ghost'
    ? classified.filter(t => t.isGhost)
    : filter === 'all'
      ? classified
      : classified.filter(t => t.classification === filter)

  function override(id, classification) {
    setOverrides(p => ({ ...p, [id]: classification }))
  }

  const isKnownBiz = (desc) =>
    KNOWN_BUSINESS_ACCOUNTS.some(a => desc.toLowerCase().includes(a.toLowerCase()))

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>A</span>
          <span className={styles.logoText}>Acceso</span>
        </div>
        <div className={styles.langToggle}>
          <button className={lang === 'en' ? styles.langActive : ''} onClick={() => setLang('en')}>EN</button>
          <button className={lang === 'es' ? styles.langActive : ''} onClick={() => setLang('es')}>ES</button>
        </div>
      </div>

      <div className={styles.ownerRow}>
        <div>
          <h1 className={styles.ownerName}>{profile.businessName || profile.ownerName}</h1>
          <p className={styles.ownerSub}>
            {es ? 'Análisis de flujo de caja' : 'Cash flow analysis'} · {es ? 'Últimos 60 días' : 'Last 60 days'}
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
          <div className={styles.metricVal} style={{ color: 'var(--green)' }}>${report.bizRevenue.toLocaleString()}</div>
          <div className={styles.metricSub}>${report.monthlyRevenue.toLocaleString()}{es ? '/mes' : '/mo avg'}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>{es ? 'Gastos negocio' : 'Business expenses'}</div>
          <div className={styles.metricVal} style={{ color: 'var(--red)' }}>${report.bizExpenses.toLocaleString()}</div>
          <div className={styles.metricSub}>${report.monthlyExpenses.toLocaleString()}{es ? '/mes' : '/mo avg'}</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>{es ? 'Flujo libre' : 'Free cash flow'}</div>
          <div className={styles.metricVal} style={{ color: 'var(--accent)' }}>${report.monthlyFree.toLocaleString()}<span style={{ fontSize: 13 }}>/mo</span></div>
          <div className={styles.metricSub}>{es ? 'Capacidad deuda' : 'Debt capacity'}: ${report.debtCapacity.toLocaleString()}/mo</div>
        </div>
        <div className={styles.metricCard} style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className={styles.metricLabel}>{es ? '"Dinero fantasma"' : '"Ghost money"'}</div>
          <div className={styles.metricVal} style={{ color: '#a78bfa' }}>${report.ghostTotal.toLocaleString()}</div>
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

        <div className={styles.txList}>
          {filtered.map(tx => (
            <div key={tx.id} className={`${styles.txRow} ${tx.isGhost ? styles.txGhost : ''}`}>
              <div className={styles.txLeft}>
                <div className={styles.txDesc}>
                  {tx.description}
                  {isKnownBiz(tx.description) && (
                    <span className={styles.verifiedBadge}>✓ {es ? 'Verificado' : 'Verified'}</span>
                  )}
                </div>
                <div className={styles.txMeta}>
                  {tx.date} · {tx.type.toUpperCase()}
                  {tx.reason && <span className={styles.txReason}> · {tx.reason}</span>}
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
      </div>

      <button className="btn-primary" onClick={() => onContinue(report, classified)}
        style={{ marginTop: '2rem' }}>
        {es ? 'Generar mi reporte de crédito →' : 'Generate my credit report →'}
      </button>
    </div>
  )
}
