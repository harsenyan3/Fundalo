import { useEffect, useState } from 'react'
import { buildNarrative } from '../lib/classifier.js'
import styles from './FondoReport.module.css'

function getFundoRating(score) {
  if (score >= 85) return { grade: 'FR-A', label: 'Lender Ready', labelEs: 'Listo para préstamo', color: '#059669', bg: '#ecfdf5', border: '#86efac' }
  if (score >= 70) return { grade: 'FR-B', label: 'Creditworthy', labelEs: 'Solvente', color: '#2563eb', bg: '#eff4ff', border: '#93c5fd' }
  if (score >= 55) return { grade: 'FR-C', label: 'Emerging', labelEs: 'En crecimiento', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
  if (score >= 40) return { grade: 'FR-D', label: 'Early Stage', labelEs: 'Etapa temprana', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' }
  return { grade: 'FR-E', label: 'Needs History', labelEs: 'Necesita historial', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
}

export default function FondoReport({ profile, report, classified, lang, setLang, onBack }) {
  const [narrative, setNarrative] = useState('')

  const rating = getFundoRating(report.reliabilityScore)
  const isEs = lang === 'es'
  const factorRows = [
    { label: isEs ? 'Volatilidad mensual de ingresos' : 'Monthly revenue volatility', val: `${report.factorSummary?.revenueVolatilityPercent || 0}%` },
    { label: isEs ? 'Margen promedio' : 'Average margin', val: `${report.factorSummary?.marginPercent || 0}%` },
    { label: isEs ? 'Cobertura clasificada' : 'Classified transaction coverage', val: `${report.factorSummary?.classificationCoveragePercent || 0}%` },
    { label: isEs ? 'Transacciones por revisar' : 'Transactions still flagged', val: `${report.factorSummary?.flaggedRatioPercent || 0}%` },
    { label: isEs ? 'Mezcla personal en salidas' : 'Personal share of outflows', val: `${report.factorSummary?.personalMixRatioPercent || 0}%` },
    { label: isEs ? 'Dinero fantasma en salidas' : 'Ghost money share of outflows', val: `${report.factorSummary?.ghostRatioPercent || 0}%` },
    { label: isEs ? 'Clientes detectados' : 'Distinct clients detected', val: `${report.distinctClients || 0}` },
    { label: isEs ? 'Años operando' : 'Years operating', val: `${report.factorSummary?.yearsOperating || 0}` },
  ]

  useEffect(() => {
    setNarrative(buildNarrative(profile, report, classified, lang, 'owner'))
  }, [classified, lang, profile, report])

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <button className={styles.backBtn} onClick={onBack}>← {isEs ? 'Volver' : 'Back'}</button>
        <div className={styles.viewToggle}>
          <button className={`${styles.viewBtn} ${lang === 'en' ? styles.viewActive : ''}`} onClick={() => setLang('en')}>
            EN
          </button>
          <button className={`${styles.viewBtn} ${lang === 'es' ? styles.viewBankActive : ''}`} onClick={() => setLang('es')}>
            ES
          </button>
        </div>
        <button className={styles.printBtn} onClick={() => window.print()}>{isEs ? 'Descargar PDF' : 'Download PDF'}</button>
      </div>

      <div className={styles.report} id="printable">
        <div className={styles.reportHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.reportLogo}>
              <div className={styles.logoMark}>F</div>
              <div>
                <div className={styles.logoName}>Fundalo</div>
                <div className={styles.logoTagline}>
                  {isEs ? 'Tu pasaporte de credito' : 'Your credit passport'}
                </div>
              </div>
            </div>
            <div className={styles.reportTitle}>
              {isEs ? 'REPORTE DE CREDITO FUNDALO' : 'FUNDALO CREDIT REPORT'}
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.metaRow}><span className={styles.metaLabel}>{isEs ? 'Fecha' : 'Date'}</span><span className={styles.metaVal}>{new Date().toLocaleDateString(isEs ? 'es-US' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            <div className={styles.metaRow}><span className={styles.metaLabel}>{isEs ? 'Negocio' : 'Business'}</span><span className={styles.metaVal}>{profile.businessName || profile.ownerName}</span></div>
            <div className={styles.metaRow}><span className={styles.metaLabel}>{isEs ? 'Dueno' : 'Owner'}</span><span className={styles.metaVal}>{profile.ownerName || 'N/A'}</span></div>
            <div className={styles.metaRow}><span className={styles.metaLabel}>{isEs ? 'Industria' : 'Industry'}</span><span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>{profile.industry}</span></div>
            <div className={styles.metaRow}><span className={styles.metaLabel}>{isEs ? 'Meses analizados' : 'Months observed'}</span><span className={styles.metaVal}>{report.monthsObserved || 0}</span></div>
          </div>
        </div>

        <div className={styles.ratingSection} style={{ background: rating.bg, borderColor: rating.border }}>
          <div className={styles.ratingLeft}>
            <div className={styles.ratingGrade} style={{ color: rating.color }}>{rating.grade}</div>
            <div className={styles.ratingLabel} style={{ color: rating.color }}>{isEs ? rating.labelEs : rating.label}</div>
            <div className={styles.ratingDesc}>{isEs ? 'Fundo rating' : 'Fundo rating'}</div>
          </div>
          <div className={styles.ratingRight}>
            <div className={styles.ratingScore}>{report.reliabilityScore}<span>/100</span></div>
            <div className={styles.ratingScoreLabel}>{isEs ? 'Puntaje de confiabilidad' : 'Reliability score'}</div>
            <div className={styles.loanRange} style={{ color: rating.color }}>${report.loanMin.toLocaleString()} – ${report.loanMax.toLocaleString()}</div>
            <div className={styles.loanRangeLabel}>{isEs ? 'Rango de préstamo estimado' : 'Estimated loan range'}</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{isEs ? 'EVALUACION EJECUTIVA' : 'EXECUTIVE ASSESSMENT'}</div>
          <div className={styles.narrative}>
            {narrative.split('\n').filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{isEs ? 'FACTORES CUANTIFICABLES' : 'QUANTIFIABLE FACTORS'}</div>
            <div className={styles.metricsTable}>
              {factorRows.map((row) => (
                <div key={row.label} className={styles.metricTableRow}>
                  <span className={styles.metricTableLabel}>{row.label}</span>
                  <span className={styles.metricTableVal}>{row.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>{isEs ? 'MÉTRICAS FINANCIERAS' : 'FINANCIAL METRICS'}</div>
            <div className={styles.metricsTable}>
              {[
                { label: isEs ? 'Ingreso mensual de negocio' : 'Monthly business revenue', val: `$${report.monthlyRevenue.toLocaleString()}` },
                { label: isEs ? 'Gasto mensual de negocio' : 'Monthly business expenses', val: `$${report.monthlyExpenses.toLocaleString()}` },
                { label: isEs ? 'Flujo libre mensual' : 'Monthly free cash flow', val: `$${report.monthlyFree.toLocaleString()}` },
                { label: isEs ? 'Margen' : 'Margin', val: `${report.marginPercent || 0}%` },
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
          <div className={styles.sectionTitle}>{isEs ? 'EVIDENCIA DE TRANSACCIONES' : 'TRANSACTION EVIDENCE'}</div>
          <div className={styles.evidenceGrid}>
            <div className={styles.evidenceCard}><div className={styles.evidenceNum}>{report.counts.total}</div><div className={styles.evidenceLabel}>{isEs ? 'Transacciones analizadas' : 'Transactions analyzed'}</div></div>
            <div className={styles.evidenceCard} style={{ background: '#ecfdf5', borderColor: '#86efac' }}><div className={styles.evidenceNum} style={{ color: '#059669' }}>{report.counts.business}</div><div className={styles.evidenceLabel}>{isEs ? 'Transacciones de negocio' : 'Business transactions'}</div></div>
            <div className={styles.evidenceCard} style={{ background: '#eff4ff', borderColor: '#93c5fd' }}><div className={styles.evidenceNum} style={{ color: '#2563eb' }}>{report.distinctClients || 0}</div><div className={styles.evidenceLabel}>{isEs ? 'Clientes detectados' : 'Distinct clients detected'}</div></div>
            <div className={styles.evidenceCard} style={{ background: '#fff7ed', borderColor: '#fdba74' }}><div className={styles.evidenceNum} style={{ color: '#ea580c' }}>{report.counts.flagged}</div><div className={styles.evidenceLabel}>{isEs ? 'Transacciones por revisar' : 'Transactions needing review'}</div></div>
          </div>
        </div>

        {Array.isArray(profile.assets) && profile.assets.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{isEs ? 'ACTIVOS DECLARADOS' : 'DECLARED ASSETS'}</div>
            <div className={styles.assetsList}>
              {profile.assets.map((asset) => (
                <div key={asset} className={styles.assetItem}>
                  <span className={styles.assetDot} />
                  <span>{asset}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.reportFooter}>
          <div className={styles.footerLeft}>
            {isEs ? 'Reporte generado por Fundalo' : 'Report generated by Fundalo'}
          </div>
          <div className={styles.footerRight}>
            {isEs
              ? 'Este reporte resume evidencia transaccional y no reemplaza la evaluacion final de un prestamista.'
              : 'This report summarizes transaction evidence and does not replace a lender’s final underwriting decision.'}
          </div>
        </div>
      </div>
    </div>
  )
}
