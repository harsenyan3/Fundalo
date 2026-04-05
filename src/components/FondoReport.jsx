import { useEffect, useState } from 'react'
import { buildNarrative } from '../lib/classifier.js'
import { estimateAssets } from '../lib/api.js'
import { buildOpportunityRecommendations } from '../lib/opportunities.js'
import styles from './FondoReport.module.css'

function getFundoRating(score) {
  if (score >= 85) return { grade: 'FR-A', label: 'Lender Ready', labelEs: 'Listo para préstamo', color: '#059669', bg: '#ecfdf5', border: '#86efac' }
  if (score >= 70) return { grade: 'FR-B', label: 'Creditworthy', labelEs: 'Solvente', color: '#2563eb', bg: '#eff4ff', border: '#93c5fd' }
  if (score >= 55) return { grade: 'FR-C', label: 'Emerging', labelEs: 'En crecimiento', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
  if (score >= 40) return { grade: 'FR-D', label: 'Early Stage', labelEs: 'Etapa temprana', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' }
  return { grade: 'FR-E', label: 'Needs History', labelEs: 'Necesita historial', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
}

function FundaloLogo({ size = 40, navyFill = '#ffffff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <path d="M40 40 C40 40 40 10 80 10 C120 10 140 40 140 70 C140 100 110 110 80 110 L40 110 Z" fill={navyFill}/>
      <path d="M40 110 L40 160 C40 160 40 190 70 190 C100 190 110 165 110 150 C110 135 95 110 80 110 Z" fill={navyFill}/>
      <circle cx="148" cy="158" r="28" fill="#2ec4a0"/>
    </svg>
  )
}

export default function FondoReport({ profile, report, classified, lang, setLang, onBack }) {
  const [narrative, setNarrative] = useState('')
  const [valuedAssets, setValuedAssets] = useState(() => Array.isArray(profile.assets) ? profile.assets : [])

  const rating = getFundoRating(report.reliabilityScore)
  const isEs = lang === 'es'
  const assetList = Array.isArray(valuedAssets) ? valuedAssets : []
  const totalEstimatedAssetValue = profile.totalEstimatedAssetValue || assetList.reduce((sum, asset) => sum + (asset.estimatedValue || 0), 0)
  const recommendationProfile = {
    ...profile,
    assets: assetList,
    totalEstimatedAssetValue,
  }
  const recommendations = buildOpportunityRecommendations(recommendationProfile, report, lang)
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

  useEffect(() => {
    let active = true
    const assets = Array.isArray(profile.assets) ? profile.assets : []
    setValuedAssets(assets)

    const needsValuation = assets.length > 0 && assets.some((asset) => !asset?.estimatedValue)
    if (!needsValuation) {
      return () => { active = false }
    }

    async function loadValuations() {
      try {
        const valued = await estimateAssets(assets.map((asset) => asset.description || asset))
        if (active) {
          setValuedAssets(valued.assets)
        }
      } catch {
        if (active) {
          setValuedAssets(assets)
        }
      }
    }

    loadValuations()
    return () => { active = false }
  }, [profile.assets])

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
              <div className={styles.logoMark}>
                <FundaloLogo size={40} />
              </div>
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

        {recommendations.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{isEs ? 'OPORTUNIDADES RECOMENDADAS' : 'RECOMMENDED OPPORTUNITIES'}</div>
            <div className={styles.opportunityIntro}>
              {isEs
                ? 'Estas oportunidades se ordenan segun el Fundo report actual: puntaje, flujo, mezcla de transacciones, etapa del negocio y activos detectados.'
                : 'These opportunities are ranked from the current Fundo report: score, cash flow, transaction mix, business stage, and detected assets.'}
            </div>
            <div className={styles.opportunityGrid}>
              {recommendations.map((item) => (
                <div key={item.id} className={styles.opportunityCard}>
                  <div className={styles.opportunityTop}>
                    <div>
                      <div className={styles.opportunityType}>
                        {item.type === 'grant'
                          ? (isEs ? 'Subvencion' : 'Grant')
                          : item.type === 'loan'
                            ? (isEs ? 'Prestamo' : 'Loan')
                            : (isEs ? 'Apoyo' : 'Support')}
                      </div>
                      <div className={styles.opportunityTitle}>{item.titleLocalized}</div>
                      <div className={styles.opportunityProvider}>{item.provider}</div>
                    </div>
                  </div>
                  <p className={styles.opportunitySummary}>{item.summaryLocalized}</p>
                  {item.reasons.length > 0 && (
                    <div className={styles.reasonsList}>
                      {item.reasons.map((reason) => (
                        <div key={reason} className={styles.reasonPill}>{reason}</div>
                      ))}
                    </div>
                  )}
                  <a
                    className={styles.opportunityLink}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {isEs ? 'Ver oportunidad oficial' : 'View official opportunity'}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {assetList.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>{isEs ? 'ACTIVOS DECLARADOS' : 'DECLARED ASSETS'}</div>
            <div className={styles.assetSummary}>
              <span>{isEs ? 'Valor total estimado' : 'Total estimated asset value'}</span>
              <strong>${totalEstimatedAssetValue.toLocaleString()}</strong>
            </div>
            <div className={styles.assetsList}>
              {assetList.map((asset) => (
                <div key={asset.description || asset} className={styles.assetItem}>
                  <span className={styles.assetDot} />
                  <div className={styles.assetInfo}>
                    <span className={styles.assetName}>{asset.description || asset}</span>
                    {asset.estimatedValue ? (
                      <span className={styles.assetMeta}>
                        {isEs ? 'Estimado' : 'Estimated'}: ${asset.estimatedValue.toLocaleString()}
                        {asset.estimatedRange ? ` (${asset.estimatedRange.low.toLocaleString()}-${asset.estimatedRange.high.toLocaleString()})` : ''}
                        {asset.valuationSource === 'anthropic'
                          ? ` · ${isEs ? 'por Claude' : 'by Claude'}`
                          : ` · ${isEs ? 'estimacion base' : 'fallback estimate'}`}
                      </span>
                    ) : null}
                    {asset.note ? (
                      <span className={styles.assetMeta}>
                        {asset.note}
                      </span>
                    ) : null}
                  </div>
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
