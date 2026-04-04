import { useState } from 'react'
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

const T = {
  en: {
    back: '← Back to home', step: 'Step', of: 'of',
    steps: [
      { title: 'Your information', sub: 'Tell us about you and your business' },
      { title: 'How you get paid', sub: 'This helps us identify your business income' },
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
    shared: 'Personal + business mixed', bizOnly: 'Business account only',
    addAsset: 'Add an asset',
    assetPlaceholder: 'e.g. 2019 van, cleaning equipment, laptop...',
    addHint: 'Press Enter or + to add',
    noAssets: 'No assets added yet',
    assetTypes: 'Assets include vehicles, equipment, inventory, property',
    next: 'Continue →', finish: 'Generate my Fondo Rating →',
  },
  es: {
    back: '← Volver al inicio', step: 'Paso', of: 'de',
    steps: [
      { title: 'Tu información', sub: 'Cuéntanos sobre ti y tu negocio' },
      { title: 'Cómo cobras', sub: 'Esto nos ayuda a identificar tus ingresos de negocio' },
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
    shared: 'Personal y negocio mezclados', bizOnly: 'Solo cuenta de negocio',
    addAsset: 'Agregar activo',
    assetPlaceholder: 'ej. Camioneta 2019, equipo de limpieza...',
    addHint: 'Presiona Enter o + para agregar',
    noAssets: 'Sin activos agregados aún',
    assetTypes: 'Incluye vehículos, equipo, inventario, propiedades',
    next: 'Continuar →', finish: 'Generar mi Fondo Rating →',
  }
}

export default function Intake({ onComplete, onBack, lang, setLang }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    ownerName: '', businessName: '', industry: 'cleaning',
    yearsOperating: '', employees: '0',
    priceMin: '', priceMax: '',
    commonExpenses: [],
    paymentFormats: ['zelle', 'venmo'],
    accountType: 'shared',
    assets: [], assetInput: '',
  })

  const t = T[lang]

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  function togglePayment(idx) {
    const val = PAYMENT_VALUES[idx]
    setForm(p => ({
      ...p,
      paymentFormats: p.paymentFormats.includes(val)
        ? p.paymentFormats.filter(v => v !== val)
        : [...p.paymentFormats, val]
    }))
  }

  function toggleExpense(idx) {
    setForm(p => ({
      ...p,
      commonExpenses: p.commonExpenses.includes(idx)
        ? p.commonExpenses.filter(v => v !== idx)
        : [...p.commonExpenses, idx]
    }))
  }

  function addAsset() {
    if (!form.assetInput.trim()) return
    setForm(p => ({ ...p, assets: [...p.assets, p.assetInput.trim()], assetInput: '' }))
  }

  function removeAsset(i) {
    setForm(p => ({ ...p, assets: p.assets.filter((_, idx) => idx !== i) }))
  }

  function handleNext() {
    if (step === 3) {
      const priceMin = parseFloat(form.priceMin) || 80
      const priceMax = parseFloat(form.priceMax) || 200
      onComplete({
        ...form,
        priceMin,
        priceMax,
        avgServicePrice: Math.round((priceMin + priceMax) / 2),
        commonExpenseLabels: form.commonExpenses.map(i => EXPENSES.en[i]),
        lang,
      })
    } else {
      setStep(s => s + 1)
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
            {t.steps.map((s, i) => (
              <div key={i} className={`${styles.stepItem} ${i + 1 === step ? styles.stepActive : ''} ${i + 1 < step ? styles.stepDone : ''}`}>
                <div className={styles.stepBubble}>{i + 1 < step ? '✓' : i + 1}</div>
                <div><div className={styles.stepName}>{s.title}</div></div>
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
          <button className={styles.backBtn} onClick={step > 1 ? () => setStep(s => s - 1) : onBack}>
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
              <input className="input" value={form.ownerName} placeholder="Rosa Martinez"
                onChange={e => set('ownerName', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className="label">{t.bizName}</label>
              <input className="input" value={form.businessName}
                placeholder={lang === 'en' ? "Rosa's Cleaning Services" : "Servicios de Limpieza Rosa"}
                onChange={e => set('businessName', e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label className="label">{t.industry}</label>
                <select className="input" value={form.industry} onChange={e => set('industry', e.target.value)}>
                  {INDUSTRIES[lang].map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="label">{t.years}</label>
                <input className="input" type="number" min="0" placeholder="2"
                  value={form.yearsOperating} onChange={e => set('yearsOperating', e.target.value)} />
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
                  <input className="input" type="number" min="0" placeholder="80"
                    value={form.priceMin} onChange={e => set('priceMin', e.target.value)} />
                </div>
                <div className={styles.field}>
                  <label className="label" style={{ fontSize: 10, marginBottom: 4 }}>{t.priceMax}</label>
                  <input className="input" type="number" min="0" placeholder="200"
                    value={form.priceMax} onChange={e => set('priceMax', e.target.value)} />
                </div>
              </div>
              {avg && (
                <div className={styles.pricePreview}>
                  {t.avgLabel}: <strong>${avg}</strong>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className="label">{t.commonExpenses}</label>
              <div className={styles.pillGrid}>
                {EXPENSES[lang].map((exp, i) => (
                  <button key={i} type="button"
                    className={`${styles.pill} ${form.commonExpenses.includes(i) ? styles.pillActive : ''}`}
                    onClick={() => toggleExpense(i)}>
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">{t.paymentFormats}</label>
              <div className={styles.pillGrid}>
                {PAYMENTS[lang].map((p, i) => (
                  <button key={i} type="button"
                    className={`${styles.pill} ${form.paymentFormats.includes(PAYMENT_VALUES[i]) ? styles.pillActive : ''}`}
                    onClick={() => togglePayment(i)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className="label">{t.accountType}</label>
              <div className={styles.radioCol}>
                {[{ val: 'shared', label: t.shared }, { val: 'business', label: t.bizOnly }].map(o => (
                  <button key={o.val} type="button"
                    className={`${styles.radioCard} ${form.accountType === o.val ? styles.radioActive : ''}`}
                    onClick={() => set('accountType', o.val)}>
                    <div className={`${styles.radioCircle} ${form.accountType === o.val ? styles.radioCircleOn : ''}`} />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className="label">{t.addAsset}</label>
              <div className={styles.assetRow}>
                <input className="input" placeholder={t.assetPlaceholder}
                  value={form.assetInput} onChange={e => set('assetInput', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addAsset()} />
                <button type="button" className={styles.addBtn} onClick={addAsset}>+</button>
              </div>
              <p className={styles.hint}>{t.addHint}</p>
            </div>
            {form.assets.length > 0
              ? <div className={styles.assetList}>
                  {form.assets.map((a, i) => (
                    <div key={i} className={styles.assetChip}>
                      <span>{a}</span>
                      <button type="button" onClick={() => removeAsset(i)}>×</button>
                    </div>
                  ))}
                </div>
              : <div className={styles.emptyAssets}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>{t.noAssets}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.assetTypes}</p>
                </div>
            }
          </div>
        )}

        <button className="btn-primary" onClick={handleNext} style={{ marginTop: '2rem' }}>
          {step === 3 ? t.finish : t.next}
        </button>
      </div>
    </div>
  )
}
