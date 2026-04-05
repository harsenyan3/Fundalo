import { useEffect, useState } from 'react'
import { analyzePlaidAccount, getApiHealth } from '../lib/api.js'
import { openPlaidLink } from '../lib/plaidLink.js'
import styles from './Intake.module.css'

const INDUSTRIES = {
  en: [
    { value: 'cleaning', label: 'Cleaning Services' },
    { value: 'construction', label: 'Construction' },
    { value: 'restaurant', label: 'Restaurant' },
    { value: 'landscaping', label: 'Landscaping' },
    { value: 'childcare', label: 'Childcare' },
    { value: 'trucking', label: 'Trucking' },
    { value: 'beauty', label: 'Beauty / Salon' },
    { value: 'retail', label: 'Retail' },
    { value: 'other', label: 'Other' },
  ],
  es: [
    { value: 'cleaning', label: 'Limpieza' },
    { value: 'construction', label: 'Construcción' },
    { value: 'restaurant', label: 'Restaurante' },
    { value: 'landscaping', label: 'Jardinería' },
    { value: 'childcare', label: 'Cuidado infantil' },
    { value: 'trucking', label: 'Transporte' },
    { value: 'beauty', label: 'Salón de belleza' },
    { value: 'retail', label: 'Tienda' },
    { value: 'other', label: 'Otro' },
  ]
}

const PAYMENTS = {
  en: ['Zelle', 'Venmo', 'Cash', 'Check', 'Card'],
  es: ['Zelle', 'Venmo', 'Efectivo', 'Cheque', 'Tarjeta'],
}

const PAYMENT_VALUES = ['zelle', 'venmo', 'cash', 'check', 'card']
const EXPENSES = {
  en: ['Supplies', 'Gas / Transport', 'Equipment', 'Phone bill', 'Marketing', 'Subcontractors', 'Insurance', 'Rent / Storage'],
  es: ['Materiales', 'Gasolina / Transporte', 'Equipo', 'Teléfono', 'Publicidad', 'Subcontratistas', 'Seguro', 'Renta / Almacén'],
}

const MANUAL_TYPES = ['cash', 'venmo', 'zelle']
const MANUAL_DIRECTIONS = ['in', 'out']

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

function buildSubmissionProfile(form, lang) {
  const priceMin = parseFloat(form.priceMin) || 80
  const priceMax = parseFloat(form.priceMax) || 200

  return {
    ...buildAnalysisProfile(form),
    priceMin,
    priceMax,
    avgServicePrice: Math.round((priceMin + priceMax) / 2),
    commonExpenseLabels: form.commonExpenses.map((index) => EXPENSES.en[index]),
    lang,
  }
}

const T = {
  en: {
    back: '← Back to home', step: 'Step', of: 'of',
    steps: [
      { title: 'Your information', sub: 'Tell us about you and your business' },
      { title: 'How you get paid', sub: 'Connect your bank and add missing cash, Venmo, or Zelle activity' },
      { title: 'Your assets', sub: 'Everything you own of value strengthens your application' },
    ],
    ownerName: 'Your full name', bizName: 'Business name',
    industry: 'Industry', years: 'Years operating',
    priceRange: 'Most common service price range',
    priceMin: 'Minimum ($)', priceMax: 'Maximum ($)',
    avgLabel: 'Average service value',
    commonExpenses: 'Common business expenses',
    paymentFormats: 'Payment methods you accept',
    accountType: 'Bank account type',
    plaidTitle: 'Connect Plaid now',
    plaidSub: 'Link your bank during the survey so the dashboard opens with real transactions instead of sample data.',
    plaidReady: 'Local API ready',
    plaidMissing: 'Local API or Plaid keys missing',
    plaidConnected: 'Plaid account connected',
    plaidConnect: 'Connect Plaid',
    plaidReconnect: 'Reconnect Plaid',
    plaidTransactions: 'transactions loaded',
    plaidStatus: 'Transactions status',
    manualTitle: 'Add cash, Venmo, and Zelle manually',
    manualSub: 'Use this for jobs or expenses that may not appear clearly in the bank feed.',
    manualType: 'Type',
    manualDirection: 'Direction',
    manualAmount: 'Amount ($)',
    manualDate: 'Date',
    manualDescription: 'Description',
    manualPlaceholder: 'Cash cleaning job from Maria, Venmo from John, etc.',
    manualAdd: 'Add transaction',
    manualEmpty: 'No manual transactions added yet',
    directionIn: 'Money in',
    directionOut: 'Money out',
    shared: 'Personal + business mixed', bizOnly: 'Business account only',
    addAsset: 'Add an asset',
    assetPlaceholder: 'e.g. 2019 van, cleaning equipment, laptop...',
    addHint: 'Press Enter or + to add',
    noAssets: 'No assets added yet',
    assetTypes: 'Assets include vehicles, equipment, inventory, property',
    next: 'Continue →', finish: 'Generate my Fundalo Rating →',
  },
  es: {
    back: '← Volver al inicio', step: 'Paso', of: 'de',
    steps: [
      { title: 'Tu información', sub: 'Cuéntanos sobre ti y tu negocio' },
      { title: 'Cómo cobras', sub: 'Conecta tu banco y agrega actividad faltante de efectivo, Venmo o Zelle' },
      { title: 'Tus activos', sub: 'Todo lo que posees con valor fortalece tu solicitud' },
    ],
    ownerName: 'Tu nombre completo', bizName: 'Nombre del negocio',
    industry: 'Industria', years: 'Años operando',
    priceRange: 'Rango de precio más común por servicio',
    priceMin: 'Mínimo ($)', priceMax: 'Máximo ($)',
    avgLabel: 'Valor promedio del servicio',
    commonExpenses: 'Gastos comunes de tu negocio',
    paymentFormats: 'Formas de pago que aceptas',
    accountType: 'Tipo de cuenta bancaria',
    plaidTitle: 'Conecta Plaid ahora',
    plaidSub: 'Conecta tu banco durante la encuesta para que el dashboard abra con transacciones reales en vez de datos de ejemplo.',
    plaidReady: 'API local lista',
    plaidMissing: 'Falta la API local o las llaves de Plaid',
    plaidConnected: 'Cuenta de Plaid conectada',
    plaidConnect: 'Conectar Plaid',
    plaidReconnect: 'Reconectar Plaid',
    plaidTransactions: 'transacciones cargadas',
    plaidStatus: 'Estado de transacciones',
    manualTitle: 'Agregar efectivo, Venmo y Zelle manualmente',
    manualSub: 'Úsalo para trabajos o gastos que no aparecen claramente en el banco.',
    manualType: 'Tipo',
    manualDirection: 'Dirección',
    manualAmount: 'Monto ($)',
    manualDate: 'Fecha',
    manualDescription: 'Descripción',
    manualPlaceholder: 'Trabajo de limpieza en efectivo de Maria, Venmo de John, etc.',
    manualAdd: 'Agregar transacción',
    manualEmpty: 'Todavía no agregaste transacciones manuales',
    directionIn: 'Dinero que entra',
    directionOut: 'Dinero que sale',
    shared: 'Personal y negocio mezclados', bizOnly: 'Solo cuenta de negocio',
    addAsset: 'Agregar activo',
    assetPlaceholder: 'ej. Camioneta 2019, equipo de limpieza...',
    addHint: 'Presiona Enter o + para agregar',
    noAssets: 'Sin activos agregados aún',
    assetTypes: 'Incluye vehículos, equipo, inventario, propiedades',
    next: 'Continuar →', finish: 'Generar mi Fundalo Rating →',
  }
}

export default function Intake({ onComplete, onBack, lang, setLang }) {
  const [step, setStep] = useState(1)
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    ownerName: '', businessName: '', industry: 'cleaning',
    yearsOperating: '', employees: '0',
    priceMin: '', priceMax: '',
    commonExpenses: [],
    paymentFormats: ['zelle', 'venmo'],
    accountType: 'shared',
    assets: [], assetInput: '',
    plaidSessionId: '',
    plaidItemId: '',
    plaidConnected: false,
    plaidMeta: null,
    prefetchedAnalysis: null,
    manualTransactions: [],
    manualType: 'cash',
    manualDirection: 'in',
    manualAmount: '',
    manualDate: today,
    manualDescription: '',
  })
  const [apiHealth, setApiHealth] = useState({ loading: true, ok: false, plaidConfigured: false, plaidEnv: 'sandbox' })
  const [plaidBusy, setPlaidBusy] = useState(false)
  const [plaidError, setPlaidError] = useState('')

  const t = T[lang]

  useEffect(() => {
    let active = true

    async function loadHealth() {
      try {
        const health = await getApiHealth()
        if (active) setApiHealth({ loading: false, ...health })
      } catch {
        if (active) setApiHealth({ loading: false, ok: false, plaidConfigured: false, plaidEnv: 'sandbox' })
      }
    }

    loadHealth()
    return () => { active = false }
  }, [])

  function set(key, val) { setForm((prev) => ({ ...prev, [key]: val })) }

  function togglePayment(index) {
    const value = PAYMENT_VALUES[index]
    setForm((prev) => ({
      ...prev,
      paymentFormats: prev.paymentFormats.includes(value)
        ? prev.paymentFormats.filter((entry) => entry !== value)
        : [...prev.paymentFormats, value]
    }))
  }

  function toggleExpense(index) {
    setForm((prev) => ({
      ...prev,
      commonExpenses: prev.commonExpenses.includes(index)
        ? prev.commonExpenses.filter((entry) => entry !== index)
        : [...prev.commonExpenses, index]
    }))
  }

  function addAsset() {
    if (!form.assetInput.trim()) return
    setForm((prev) => ({ ...prev, assets: [...prev.assets, prev.assetInput.trim()], assetInput: '' }))
  }

  function removeAsset(index) {
    setForm((prev) => ({ ...prev, assets: prev.assets.filter((_, current) => current !== index) }))
  }

  function addManualTransaction() {
    const amount = Number(form.manualAmount)
    if (!amount || !form.manualDate || !form.manualDescription.trim()) return

    const signedAmount = form.manualDirection === 'in' ? Math.abs(amount) : -Math.abs(amount)
    const manualTransaction = {
      id: `manual-${Date.now()}`,
      date: form.manualDate,
      description: form.manualDescription.trim(),
      amount: signedAmount,
      direction: form.manualDirection,
      type: form.manualType,
      category: null,
      source: 'manual',
    }

    setForm((prev) => ({
      ...prev,
      manualTransactions: [manualTransaction, ...prev.manualTransactions],
      manualAmount: '',
      manualDescription: '',
      manualDate: today,
    }))
  }

  function removeManualTransaction(id) {
    setForm((prev) => ({
      ...prev,
      manualTransactions: prev.manualTransactions.filter((tx) => tx.id !== id),
    }))
  }

  async function handleConnectPlaid() {
    setPlaidError('')
    setPlaidBusy(true)

    try {
      const health = await getApiHealth()
      setApiHealth({ loading: false, ...health })

      if (!health.ok || !health.plaidConfigured) {
        throw new Error('Local API is not ready. Run `npm run dev:full`, then add Plaid keys to `.env`.')
      }

      const hydratedProfile = buildSubmissionProfile(form, lang)
      const exchange = await openPlaidLink(hydratedProfile)
      if (!exchange) {
        setPlaidBusy(false)
        return
      }

      const analysis = await analyzePlaidAccount({
        sessionId: exchange.sessionId,
        profile: hydratedProfile,
        days: 180,
      })

      setForm((prev) => ({
        ...prev,
        plaidSessionId: exchange.sessionId,
        plaidItemId: exchange.itemId,
        plaidConnected: true,
        plaidMeta: analysis.meta,
        prefetchedAnalysis: analysis,
      }))
    } catch (error) {
      setPlaidError(error.message)
    } finally {
      setPlaidBusy(false)
    }
  }

  function handleNext() {
    if (step === 3) {
      onComplete(buildSubmissionProfile(form, lang))
    } else {
      setStep((current) => current + 1)
    }
  }

  const avg = form.priceMin && form.priceMax
    ? Math.round((parseFloat(form.priceMin) + parseFloat(form.priceMax)) / 2)
    : null

  return (
    <div className={styles.wrapper}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>F</div>
            <span className={styles.logoText}>Fundalo</span>
          </div>
          <div className={styles.steps}>
            {t.steps.map((entry, index) => (
              <div key={entry.title} className={`${styles.stepItem} ${index + 1 === step ? styles.stepActive : ''} ${index + 1 < step ? styles.stepDone : ''}`}>
                <div className={styles.stepBubble}>{index + 1 < step ? '✓' : index + 1}</div>
                <div><div className={styles.stepName}>{entry.title}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.sidebarQuote}>
          {lang === 'en'
            ? '"Your business has always been creditworthy. Now we can prove it."'
            : '"Tu negocio siempre fue solvente. Ahora podemos demostrarlo."'}
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.mainTop}>
          <button className={styles.backBtn} onClick={step > 1 ? () => setStep((current) => current - 1) : onBack}>
            {step > 1 ? `← ${lang === 'en' ? 'Back' : 'Atrás'}` : t.back}
          </button>
          <div className={styles.langToggle}>
            <button className={lang === 'en' ? styles.langOn : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'es' ? styles.langOn : ''} onClick={() => setLang('es')}>ES</button>
          </div>
        </div>

        <div className={styles.stepNum}>{t.step} {step} {t.of} 3</div>
        <h2 className={styles.title}>{t.steps[step - 1].title}</h2>
        <p className={styles.sub}>{t.steps[step - 1].sub}</p>

        {step === 1 && (
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className="label">{t.ownerName}</label>
              <input className="input" value={form.ownerName} placeholder="Rosa Martinez" onChange={(e) => set('ownerName', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className="label">{t.bizName}</label>
              <input className="input" value={form.businessName} placeholder={lang === 'en' ? "Rosa's Cleaning Services" : 'Servicios de Limpieza Rosa'} onChange={(e) => set('businessName', e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className="label">{t.industry}</label>
                <select className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)}>
                  {INDUSTRIES[lang].map((industry) => <option key={industry.value} value={industry.value}>{industry.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="label">{t.years}</label>
                <input className="input" type="number" min="0" placeholder="2" value={form.yearsOperating} onChange={(e) => set('yearsOperating', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className="label">{t.priceRange}</label>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className="label" style={{ fontSize: 10, marginBottom: 4 }}>{t.priceMin}</label>
                  <input className="input" type="number" min="0" placeholder="80" value={form.priceMin} onChange={(e) => set('priceMin', e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className="label" style={{ fontSize: 10, marginBottom: 4 }}>{t.priceMax}</label>
                  <input className="input" type="number" min="0" placeholder="200" value={form.priceMax} onChange={(e) => set('priceMax', e.target.value)} />
                </div>
              </div>
              {avg && <div className={styles.pricePreview}>{t.avgLabel}: <strong>${avg}</strong></div>}
            </div>

            <div className={styles.field}>
              <label className="label">{t.commonExpenses}</label>
              <div className={styles.pillGrid}>
                {EXPENSES[lang].map((expense, index) => (
                  <button key={expense} type="button" className={`${styles.pill} ${form.commonExpenses.includes(index) ? styles.pillActive : ''}`} onClick={() => toggleExpense(index)}>
                    {expense}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">{t.paymentFormats}</label>
              <div className={styles.pillGrid}>
                {PAYMENTS[lang].map((payment, index) => (
                  <button key={payment} type="button" className={`${styles.pill} ${form.paymentFormats.includes(PAYMENT_VALUES[index]) ? styles.pillActive : ''}`} onClick={() => togglePayment(index)}>
                    {payment}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">{t.accountType}</label>
              <div className={styles.radioCol}>
                {[{ val: 'shared', label: t.shared }, { val: 'business', label: t.bizOnly }].map((option) => (
                  <button key={option.val} type="button" className={`${styles.radioCard} ${form.accountType === option.val ? styles.radioActive : ''}`} onClick={() => set('accountType', option.val)}>
                    <div className={`${styles.radioCircle} ${form.accountType === option.val ? styles.radioCircleOn : ''}`} />
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.plaidCard}>
              <div className={styles.plaidHeader}>
                <div>
                  <div className={styles.plaidTitle}>{t.plaidTitle}</div>
                  <div className={styles.plaidSub}>{t.plaidSub}</div>
                </div>
                <div className={`${styles.statusPill} ${apiHealth.ok && apiHealth.plaidConfigured ? styles.statusReady : styles.statusWarn}`}>
                  {apiHealth.loading ? '...' : apiHealth.ok && apiHealth.plaidConfigured ? `${t.plaidReady} · ${apiHealth.plaidEnv}` : t.plaidMissing}
                </div>
              </div>

              <button type="button" className={styles.plaidButton} onClick={handleConnectPlaid} disabled={plaidBusy}>
                {plaidBusy ? (lang === 'en' ? 'Connecting...' : 'Conectando...') : form.plaidConnected ? t.plaidReconnect : t.plaidConnect}
              </button>

              {form.plaidConnected && form.plaidMeta && (
                <div className={styles.plaidSuccess}>
                  <strong>{t.plaidConnected}</strong>
                  <span>{form.plaidMeta.transactionCount} {t.plaidTransactions}</span>
                  <span>{t.plaidStatus}: {form.plaidMeta.transactionsUpdateStatus}</span>
                </div>
              )}

              {plaidError && <div className={styles.plaidError}>{plaidError}</div>}
            </div>

            <div className={styles.manualCard}>
              <div className={styles.plaidTitle}>{t.manualTitle}</div>
              <div className={styles.plaidSub}>{t.manualSub}</div>

              <div className={styles.manualGrid}>
                <div className={styles.field}>
                  <label className="label">{t.manualType}</label>
                  <select className="input" value={form.manualType} onChange={(e) => set('manualType', e.target.value)}>
                    {MANUAL_TYPES.map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className="label">{t.manualDirection}</label>
                  <select className="input" value={form.manualDirection} onChange={(e) => set('manualDirection', e.target.value)}>
                    {MANUAL_DIRECTIONS.map((direction) => (
                      <option key={direction} value={direction}>{direction === 'in' ? t.directionIn : t.directionOut}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className="label">{t.manualAmount}</label>
                  <input className="input" type="number" min="0" value={form.manualAmount} onChange={(e) => set('manualAmount', e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className="label">{t.manualDate}</label>
                  <input className="input" type="date" value={form.manualDate} onChange={(e) => set('manualDate', e.target.value)} />
                </div>
              </div>

              <div className={styles.field}>
                <label className="label">{t.manualDescription}</label>
                <div className={styles.manualAddRow}>
                  <input className="input" value={form.manualDescription} placeholder={t.manualPlaceholder} onChange={(e) => set('manualDescription', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addManualTransaction()} />
                  <button type="button" className={styles.manualAddButton} onClick={addManualTransaction}>{t.manualAdd}</button>
                </div>
              </div>

              {form.manualTransactions.length > 0 ? (
                <div className={styles.manualList}>
                  {form.manualTransactions.map((tx) => (
                    <div key={tx.id} className={styles.manualRow}>
                      <div>
                        <div className={styles.manualDesc}>{tx.description}</div>
                        <div className={styles.manualMeta}>{tx.date} · {tx.type.toUpperCase()} · {tx.direction === 'in' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}</div>
                      </div>
                      <button type="button" className={styles.manualRemove} onClick={() => removeManualTransaction(tx.id)}>×</button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.manualEmpty}>{t.manualEmpty}</div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className="label">{t.addAsset}</label>
              <div className={styles.assetRow}>
                <input className="input" placeholder={t.assetPlaceholder} value={form.assetInput} onChange={(e) => set('assetInput', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAsset()} />
                <button type="button" className={styles.addBtn} onClick={addAsset}>+</button>
              </div>
              <p className={styles.hint}>{t.addHint}</p>
            </div>
            {form.assets.length > 0 ? (
              <div className={styles.assetList}>
                {form.assets.map((asset, index) => (
                  <div key={asset + index} className={styles.assetChip}>
                    <span>{asset}</span>
                    <button type="button" onClick={() => removeAsset(index)}>×</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyAssets}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>{t.noAssets}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.assetTypes}</p>
              </div>
            )}
          </div>
        )}

        <button className="btn-primary" onClick={handleNext} style={{ marginTop: '2rem' }}>
          {step === 3 ? t.finish : t.next}
        </button>
      </div>
    </div>
  )
}
