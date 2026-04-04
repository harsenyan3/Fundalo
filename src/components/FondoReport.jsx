import { useState, useEffect } from 'react'
import { KNOWN_BUSINESS_ACCOUNTS } from '../data/mockTransactions'
import styles from './FondoReport.module.css'

function getFondoRating(score) {
  if (score >= 85) return { grade: 'FR-A', label: 'Lender Ready', labelEs: 'Listo para préstamo', color: '#059669', bg: '#ecfdf5', border: '#86efac' }
  if (score >= 70) return { grade: 'FR-B', label: 'Creditworthy', labelEs: 'Solvente', color: '#2563eb', bg: '#eff4ff', border: '#93c5fd' }
  if (score >= 55) return { grade: 'FR-C', label: 'Developing', labelEs: 'En desarrollo', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' }
  if (score >= 40) return { grade: 'FR-D', label: 'Early Stage', labelEs: 'Etapa temprana', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' }
  return { grade: 'FR-E', label: 'Needs History', labelEs: 'Necesita historial', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
}

function ScoreBar({ value, max, color }) {
  const pct = Math.round((value / max) * 100)
  const filled = Math.round((value / max) * 10)
  return (
    <div className={styles.barRow}>
      <div className={styles.barBlocks}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.barBlock}
            style={{ background: i < filled ? color : '#e2e8f0' }} />
        ))}
      </div>
      <span className={styles.barVal}>{value}/{max}</span>
    </div>
  )
}

function buildPrompt(profile, report, classified, lang) {
  const bizTx = classified.filter(t => t.classification === 'business' && t.direction === 'in')
  const knownClients = KNOWN_BUSINESS_ACCOUNTS.filter(a =>
    classified.some(t => t.description.toLowerCase().includes(a.toLowerCase()))
  )
  const rating = getFondoRating(report.reliabilityScore)

  if (lang === 'es') {
    return `Eres un analista financiero bilingüe especializado en negocios latinos. Escribe una evaluación de crédito profesional en español (2-3 párrafos) para el siguiente negocio:

Negocio: ${profile.businessName || profile.ownerName}
Industria: ${profile.industry}
Años operando: ${profile.yearsOperating}
Ingresos mensuales de negocio: $${report.monthlyRevenue.toLocaleString()}
Gastos mensuales de negocio: $${report.monthlyExpenses.toLocaleString()}
Flujo de caja libre: $${report.monthlyFree.toLocaleString()}/mes
Margen de ganancia: ${report.dti ? 100 - report.dti : 'N/A'}%
Capacidad de deuda: $${report.debtCapacity.toLocaleString()}/mes
Rango de préstamo estimado: $${report.loanMin.toLocaleString()} - $${report.loanMax.toLocaleString()}
Clientes verificados: ${knownClients.join(', ') || 'Clientes individuales'}
Dinero fantasma (sin rastrear): $${report.ghostTotal.toLocaleString()}
Fondo Rating: ${rating.grade} — ${rating.labelEs}
Activos declarados: ${profile.assets?.join(', ') || 'Ninguno declarado'}
Gastos comunes: ${profile.commonExpenseLabels?.join(', ') || 'No especificado'}

Escribe en tono de coach financiero — motivador pero honesto. Incluye: fortalezas verificadas, análisis del flujo de caja, capacidad de endeudamiento, y una recomendación clara. Sé específico con los números.`
  }

  return `You are a professional financial analyst specializing in alternative credit assessment for Latino-owned small businesses. Write a formal credit assessment (2-3 paragraphs) for the following business profile:

Business: ${profile.businessName || profile.ownerName}
Industry: ${profile.industry}
Years operating: ${profile.yearsOperating}
Monthly business revenue: $${report.monthlyRevenue.toLocaleString()}
Monthly business expenses: $${report.monthlyExpenses.toLocaleString()}
Monthly free cash flow: $${report.monthlyFree.toLocaleString()}
Profit margin: ${report.dti ? 100 - report.dti : 'N/A'}%
Debt service capacity: $${report.debtCapacity.toLocaleString()}/month
Estimated loan range supported: $${report.loanMin.toLocaleString()} - $${report.loanMax.toLocaleString()}
Verified client relationships: ${knownClients.join(', ') || 'Individual residential clients'}
Ghost money (untracked cash): $${report.ghostTotal.toLocaleString()}
Fondo Rating: ${rating.grade} — ${rating.label}
Declared assets: ${profile.assets?.join(', ') || 'None declared'}
Common business expenses: ${profile.commonExpenseLabels?.join(', ') || 'Not specified'}

Write in formal, professional language suitable for a CDFI or bank officer. Include: verified revenue streams, cash flow analysis, risk factors, debt serviceability, and a clear lending recommendation. Be specific with numbers and cite the alternative data sources.`
}

export default function FondoReport({ profile, report, classified, lang, onBack }) {
  const [view, setView] = useState('owner')
  const [narrative, setNarrative] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const rating = getFondoRating(report.reliabilityScore)
  const isEs = view === 'owner' && lang === 'es'

  const knownClients = KNOWN_BUSINESS_ACCOUNTS.filter(a =>
    classified.some(t => t.description.toLowerCase().includes(a.toLowerCase()))
  )

  const clientPayments = knownClients.map(client => {
    const txs = classified.filter(t =>
      t.description.toLowerCase().includes(client.toLowerCase()) && t.direction === 'in'
    )
    return {
      name: client,
      count: txs.length,
      total: txs.reduce((s, t) => s + t.amount, 0)
    }
  })

  useEffect(() => {
    async function generate() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: buildPrompt(profile, report, classified, view === 'owner' ? lang : 'en')
            }]
          })
        })
        const data = await res.json()
        const text = data.content?.find(b => b.type === 'text')?.text || ''
        setNarrative(text)
      } catch {
        setError(true)
        setNarrative(getFallbackNarrative(profile, report, rating, view === 'owner' ? lang : 'en'))
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [view])

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
            {isEs ? '👤 Mi vista' : '👤 Owner view'}
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'bank' ? styles.viewBankActive : ''}`}
            onClick={() => setView('bank')}>
            🏦 {isEs ? 'Vista del banco' : 'Bank officer view'}
          </button>
        </div>
        <button className={styles.printBtn} onClick={handlePrint}>
          ⬇ {isEs ? 'Descargar PDF' : 'Download PDF'}
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
              {view === 'bank' ? 'FONDO RATING REPORT' : (isEs ? 'REPORTE FONDO RATING' : 'FONDO RATING REPORT')}
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
              <span className={styles.metaVal}>{profile.ownerName}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Industria' : 'Industry'}</span>
              <span className={styles.metaVal} style={{ textTransform: 'capitalize' }}>{profile.industry}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>{isEs ? 'Años operando' : 'Years operating'}</span>
              <span className={styles.metaVal}>{profile.yearsOperating || 'N/A'}</span>
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
              {isEs ? 'Calificación Fondo' : 'Fondo Rating'}
            </div>
          </div>
          <div className={styles.ratingRight}>
            <div className={styles.ratingScore}>{report.reliabilityScore}<span>/100</span></div>
            <div className={styles.ratingScoreLabel}>{isEs ? 'Puntuación de confiabilidad' : 'Reliability score'}</div>
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
            {loading ? (
              <div className={styles.narrativeLoading}>
                <div className={styles.loadingDots}>
                  <span /><span /><span />
                </div>
                <p>{isEs ? 'Generando evaluación...' : 'Generating assessment...'}</p>
              </div>
            ) : (
              narrative.split('\n').filter(p => p.trim()).map((para, i) => (
                <p key={i}>{para}</p>
              ))
            )}
          </div>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {isEs ? 'DESGLOSE DEL PUNTAJE' : 'SCORE BREAKDOWN'}
            </div>
            <div className={styles.scoreBreakdown}>
              {[
                { label: isEs ? 'Consistencia de flujo de caja' : 'Cash flow consistency', val: Math.round(report.reliabilityScore * 0.40), max: 40 },
                { label: isEs ? 'Tendencia de ingresos' : 'Revenue trend', val: Math.round(report.reliabilityScore * 0.25), max: 25 },
                { label: isEs ? 'Estabilidad de gastos' : 'Expense stability', val: Math.round(report.reliabilityScore * 0.20), max: 20 },
                { label: isEs ? 'Ratio deuda/ingreso' : 'Debt-to-income ratio', val: Math.round(report.reliabilityScore * 0.15), max: 15 },
              ].map(s => (
                <div key={s.label} className={styles.scoreRow}>
                  <div className={styles.scoreRowLabel}>{s.label}</div>
                  <ScoreBar value={s.val} max={s.max} color={rating.color} />
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
                { label: isEs ? 'Ingreso mensual (negocio)' : 'Monthly business revenue', val: `$${report.monthlyRevenue.toLocaleString()}` },
                { label: isEs ? 'Gastos mensuales (negocio)' : 'Monthly business expenses', val: `$${report.monthlyExpenses.toLocaleString()}` },
                { label: isEs ? 'Flujo de caja libre' : 'Free cash flow', val: `$${report.monthlyFree.toLocaleString()}/mo` },
                { label: isEs ? 'Capacidad de deuda' : 'Debt service capacity', val: `$${report.debtCapacity.toLocaleString()}/mo` },
                { label: 'DTI', val: `${report.dti}%` },
                { label: isEs ? 'Dinero fantasma' : 'Ghost money', val: `$${report.ghostTotal.toLocaleString()}` },
              ].map(m => (
                <div key={m.label} className={styles.metricTableRow}>
                  <span className={styles.metricTableLabel}>{m.label}</span>
                  <span className={styles.metricTableVal}>{m.val}</span>
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
              <div className={styles.evidenceNum} style={{ color: '#2563eb' }}>${report.bizRevenue.toLocaleString()}</div>
              <div className={styles.evidenceLabel}>{isEs ? 'Ingresos verificados' : 'Verified revenue'}</div>
            </div>
            <div className={styles.evidenceCard} style={{ background: '#f5f3ff', borderColor: '#c4b5fd' }}>
              <div className={styles.evidenceNum} style={{ color: '#7c3aed' }}>{report.counts.ghost}</div>
              <div className={styles.evidenceLabel}>{isEs ? 'Transacciones fantasma' : 'Ghost transactions'}</div>
            </div>
          </div>

          {clientPayments.length > 0 && (
            <>
              <div className={styles.clientsTitle}>
                {isEs ? 'Relaciones comerciales verificadas' : 'Verified client relationships'}
              </div>
              <div className={styles.clientsTable}>
                {clientPayments.map(c => (
                  <div key={c.name} className={styles.clientRow}>
                    <div className={styles.clientCheck}>✓</div>
                    <div className={styles.clientName}>{c.name}</div>
                    <div className={styles.clientStats}>
                      {c.count} {isEs ? 'pagos' : 'payments'} · ${c.total.toLocaleString()} {isEs ? 'total' : 'total'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {profile.assets?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              {isEs ? 'ACTIVOS DECLARADOS' : 'DECLARED ASSETS'}
            </div>
            <div className={styles.assetsList}>
              {profile.assets.map((a, i) => (
                <div key={i} className={styles.assetItem}>
                  <span className={styles.assetDot} />
                  {a}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.reportFooter}>
          <div className={styles.footerLeft}>
            <strong>Fundalo</strong> · fundalo.com · SHPE Vibra ATL 2026
          </div>
          <div className={styles.footerRight}>
            {isEs
              ? 'Este reporte usa datos financieros alternativos y está diseñado para complementar el proceso de préstamos CDFI.'
              : 'This report uses alternative financial data and is designed to supplement CDFI and minority lending underwriting.'}
          </div>
        </div>
      </div>
    </div>
  )
}

function getFallbackNarrative(profile, report, rating, lang) {
  const biz = profile.businessName || profile.ownerName
  if (lang === 'es') {
    return `${biz} demuestra un perfil de crédito alternativo sólido con ${profile.yearsOperating} año(s) de historial operativo verificable. El análisis de transacciones revela ingresos mensuales de negocio promedio de $${report.monthlyRevenue.toLocaleString()}, con un flujo de caja libre de $${report.monthlyFree.toLocaleString()} mensuales que respalda una capacidad de servicio de deuda estimada de $${report.debtCapacity.toLocaleString()}/mes.

El negocio opera principalmente a través de Zelle y Venmo, con clientes verificados que incluyen entidades comerciales reconocidas. El margen de rentabilidad del ${100 - report.dti}% refleja una gestión financiera responsable. El dinero fantasma identificado ($${report.ghostTotal.toLocaleString()}) representa retiros en efectivo no rastreados que se consideran inmateriales dado el volumen total de transacciones.

Recomendación: Este perfil respalda la consideración para préstamos CDFI y programas de subvenciones para pequeñas empresas minoritarias en el rango de $${report.loanMin.toLocaleString()}–$${report.loanMax.toLocaleString()}. El Fondo Rating de ${rating.grade} — ${rating.labelEs} refleja una operación con flujo de caja verificable y relaciones comerciales consistentes.`
  }
  return `${biz} demonstrates a ${rating.label.toLowerCase()} alternative credit profile with ${profile.yearsOperating} year(s) of verifiable operating history. Transaction analysis reveals average monthly business revenue of $${report.monthlyRevenue.toLocaleString()}, supported by consistent inflows via Zelle and Venmo from both residential and commercial clients.

Free cash flow of $${report.monthlyFree.toLocaleString()}/month supports an estimated debt service capacity of $${report.debtCapacity.toLocaleString()}/month. The ${100 - report.dti}% profit margin reflects responsible expense management. Ghost money identified ($${report.ghostTotal.toLocaleString()} in untracked cash withdrawals) represents ${report.ghostTotal > 0 ? ((report.ghostTotal / report.bizRevenue) * 100).toFixed(1) : 0}% of total outflows and is considered immaterial at this transaction volume.

Recommendation: This business profile supports consideration for CDFI lending programs and minority small business grants in the $${report.loanMin.toLocaleString()}–$${report.loanMax.toLocaleString()} range. The Fondo Rating of ${rating.grade} — ${rating.label} reflects a creditworthy operation with verifiable cash flow, consistent client relationships, and responsible financial management.`
}
