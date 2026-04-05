import { useEffect, useState } from 'react'
import { buildNarrative } from '../lib/classifier.js'
import styles from './FondoReport.module.css'

function getFondoRating(score) {
  if (score >= 85) return { grade: 'FR-A', label: 'Lender Ready', labelEs: 'Listo para préstamo', color: '#059669', bg: '#ecfdf5', border: '#86efac' }
  if (score >= 70) return { grade: 'FR-B', label: 'Creditworthy', labelEs: 'Solvente', color: '#2563eb', bg: '#eff4ff', border: '#93c5fd' }
  if (score >= 55) return { grade: 'FR-C', label: 'Developing', labelEs: 'En desarrollo', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
  if (score >= 40) return { grade: 'FR-D', label: 'Early Stage', labelEs: 'Etapa temprana', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' }
  return { grade: 'FR-E', label: 'Needs History', labelEs: 'Necesita historial', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
}

function ScoreBar({ value, max, color }) {
  const filled = Math.round((value / max) * 10)

  return (
    <div className={styles.barRow}>
      <div className={styles.barBlocks}>
        {Array.from({ length: 10 }).map((_, index) => (
          <div
            key={index}
            className={styles.barBlock}
            style={{ background: index < filled ? color : '#e2e8f0' }}
          />
        ))}
      </div>
      <span className={styles.barVal}>{value}/{max}</span>
    </div>
  )
}

export default function FondoReport({ profile, report, classified, lang, onBack }) {
  const [view, setView] = useState('owner')
  const [narrative, setNarrative] = useState('')

  const rating = getFondoRating(report.reliabilityScore)
  const isEs = view === 'owner' && lang === 'es'
  const scoreRows = [
    { label: isEs ? 'Consistencia de ingresos' : 'Revenue consistency', val: report.scoreBreakdown.revenueConsistency, max: 30 },
    { label: isEs ? 'Salud del flujo de caja' : 'Cash flow health', val: report.scoreBreakdown.cashFlowHealth, max: 25 },
    { label: isEs ? 'Separación negocio/personal' : 'Business vs personal separation', val: report.scoreBreakdown.separationDiscipline, max: 20 },
    { label: isEs ? 'Diversidad de clientes' : 'Client diversity', val: report.scoreBreakdown.clientDiversity, max: 10 },
    { label: isEs ? 'Historial operativo' : 'Operating history', val: report.scoreBreakdown.operatingHistory, max: 5 },
    { label: isEs ? 'Calidad de evidencia' : 'Evidence quality', val: report.scoreBreakdown.evidenceQuality, max: 10 },
  ]

  useEffect(() => {
    const audience = view === 'bank' ? 'bank' : 'owner'
    const language = audience === 'bank' ? 'en' : lang
    setNarrative(buildNarrative(profile, report, classified, language, audience))
  }, [classified, lang, profile, report, view])

  function handlePrint() {
    window.print()
  }

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <button className={styles.backBtn} onClick={onBack}>
          ← {isEs ? 'Volver' : 'Back'}
        </button>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'owner' ? styles.viewActive : ''}`}
            onClick={() => setView('owner')}>
            {isEs ? 'Mi vista' : 'Owner view'}
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'bank' ? styles.viewBankActive : ''}`}
            onClick={() => setView('bank')}>
            {isEs ? 'Vista del banco' : 'Bank officer view'}
          </button>
        </div>
        <button className={styles.printBtn} onClick={handlePrint}>
          {isEs ? 'Descargar PDF' : 'Download PDF'}
        </button>
      </div>

      <div className={`${styles.report} ${view === 'bank' ? styles.reportBank : ''}`} id="printable">
        <div className={styles.reportHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.reportLogo}>
              <div className={styles.logoMark}>F</div>
              <div>
                <div className={styles.logoName}>Fundalo</div>
                <div className={styles.logoTagline}>
                  {view === 'bank' ? 'Alternative Credit Intelligence' : (isEs ? 'Tu Pasaporte de Crédito' : 'Your Credit Passport')}
                </div>
              </div>
            </div>
            <div className={styles.reportTitle}>
              {view === 'bank' ? 'FUNDALO CREDIT REPORT' : (isEs ? 'REPORTE DE CRÉDITO FUNDALO' : 'FUNDALO CREDIT REPORT')}
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Fecha' : 'Date'}</span>
              <span className={styles.metaVal}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Negocio' : 'Business'}</span>
              <span className={styles.metaVal}>{profile.businessName || profile.ownerName}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Dueño' : 'Owner'}</span>
              <span className={styles.metaVal}>{profile.ownerName || 'N/A'}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Industria' : 'Industry'}</span>
              <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>{profile.industry}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Meses analizados' : 'Months observed'}</span>
              <span className={styles.metaVal}>{report.monthsObserved}</span>
            </div>
          </div>
        </div>

        <div className={styles.ratingSection} style={{ background: rating.bg, borderColor: rating.border }}>
          <div className={styles.ratingLeft}>
            <div className={styles.ratingGrade} style={{ color: rating.color }}>{rating.grade}</div>
            <div className={styles.ratingLabel} style={{ color: rating.color }}>
              {isEs ? rating.labelEs : rating.label}
            </div>
            <div className={styles.ratingDesc}>
              {isEs ? 'Calificación Fundalo' : 'Fundalo rating'}
            </div>
          </div>
          <div className={styles.ratingRight}>
            <div className={styles.ratingScore}>{report.reliabilityScore}<span>/100</span></div>
            <div className={styles.ratingScoreLabel}>{isEs ? 'Puntaje de confiabilidad' : 'Reliability score'}</div>
            <div className={styles.loanRange} style={{ color: rating.color }}>
              ${report.loanMin.toLocaleString()} – ${report.loanMax.toLocaleString()}
            </div>
            <div className={styles.loanRangeLabel}>{isEs ? 'Rango de préstamo estimado' : 'Estimated loan range'}</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {view === 'bank' ? 'EXECUTIVE ASSESSMENT' : (isEs ? 'EVALUACIÓN EJECUTIVA' : 'EXECUTIVE ASSESSMENT')}
          </div>
          <div className={styles.narrative}>
            {narrative.split('\n').filter(Boolean).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {isEs ? 'DESGLOSE DEL PUNTAJE' : 'SCORE BREAKDOWN'}
            </div>
            <div className={styles.scoreBreakdown}>
              {scoreRows.map((row) => (
                <div key={row.label} className={styles.scoreRow}>
                  <div className={styles.scoreRowLabel}>{row.label}</div>
                  <ScoreBar value={row.val} max={row.max} color={rating.color} />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {isEs ? 'MÉTRICAS FINANCIERAS' : 'FINANCIAL METRICS'}
            </div>
            <div className={styles.metricsTable}>
              {[
                { label: isEs ? 'Ingreso mensual de negocio' : 'Monthly business revenue', val: `$${report.monthlyRevenue.toLocaleString()}` },
                { label: isEs ? 'Gasto mensual de negocio' : 'Monthly business expenses', val: `$${report.monthlyExpenses.toLocaleString()}` },
                { label: isEs ? 'Flujo libre mensual' : 'Monthly free cash flow', val: `$${report.monthlyFree.toLocaleString()}` },
                { label: isEs ? 'Margen' : 'Margin', val: `${report.marginPercent}%` },
                { label: 'DTI', val: `${report.dti}%` },
                { label: isEs ? 'Dinero fantasma' : 'Ghost money', val: `$${report.ghostTotal.toLocaleString()}` },
              ].map((metric) => (
                <div key={metric.label} className={styles.metricTableRow}>
                  <span className={styles.metricTableLabel}>{metric.label}</span>
                  <span className={styles.metricTableVal}>{metric.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {isEs ? 'EVIDENCIA DE TRANSACCIONES' : 'TRANSACTION EVIDENCE'}
          </div>
          <div className={styles.evidenceGrid}>
            <div className={styles.evidenceCard}>
              <div className={styles.evidenceNum}>{report.counts.total}</div>
              <div className={styles.evidenceLabel}>{isEs ? 'Transacciones analizadas' : 'Transactions analyzed'}</div>
            </div>
            <div className={styles.evidenceCard} style={{ background: '#ecfdf5', borderColor: '#86efac' }}>
              <div className={styles.evidenceNum} style={{ color: '#059669' }}>{report.counts.business}</div>
              <div className={styles.evidenceLabel}>{isEs ? 'Transacciones de negocio' : 'Business transactions'}</div>
            </div>
            <div className={styles.evidenceCard} style={{ background: '#eff4ff', borderColor: '#93c5fd' }}>
              <div className={styles.evidenceNum} style={{ color: '#2563eb' }}>{report.distinctClients}</div>
              <div className={styles.evidenceLabel}>{isEs ? 'Clientes detectados' : 'Distinct clients detected'}</div>
            </div>
            <div className={styles.evidenceCard} style={{ background: '#fff7ed', borderColor: '#fdba74' }}>
              <div className={styles.evidenceNum} style={{ color: '#ea580c' }}>{report.counts.flagged}</div>
              <div className={styles.evidenceLabel}>{isEs ? 'Transacciones por revisar' : 'Transactions needing review'}</div>
            </div>
          </div>

          {report.verifiedRelationships.length > 0 && (
            <>
              <div className={styles.clientsTitle}>
                {isEs ? 'Relaciones comerciales verificadas' : 'Verified business relationships'}
              </div>
              <div className={styles.clientsTable}>
                {report.verifiedRelationships.map((client) => (
                  <div key={client.name} className={styles.clientRow}>
                    <div className={styles.clientCheck}>✓</div>
                    <div className={styles.clientName}>{client.name}</div>
                    <div className={styles.clientStats}>
                      {client.count} {isEs ? 'pagos' : 'payments'} · ${Math.round(client.total).toLocaleString()} {isEs ? 'total' : 'total'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            {isEs ? 'MUESTRA DE CLASIFICACIÓN' : 'CLASSIFICATION SAMPLE'}
          </div>
          <div className={styles.clientsTable}>
            {classified.slice(0, 10).map((tx) => (
              <div key={tx.id} className={styles.clientRow}>
                <div className={styles.clientCheck}>{tx.classification === 'business' ? 'B' : tx.classification === 'personal' ? 'P' : '?'}</div>
                <div className={styles.clientName}>{tx.description}</div>
                <div className={styles.clientStats}>
                  {tx.date} · {tx.direction === 'in' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()} · {tx.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
