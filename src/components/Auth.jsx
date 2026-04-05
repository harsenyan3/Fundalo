import { useState } from 'react'
import { useAuth } from '../lib/auth'
import styles from './Auth.module.css'

export default function Auth({ onSuccess, lang, onBack }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  const es = lang === 'es'

  function set(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    setError('')
  }

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!form.name.trim()) { setError(es ? 'Ingresa tu nombre' : 'Enter your name'); setLoading(false); return }
        if (!form.email.trim()) { setError(es ? 'Ingresa tu email' : 'Enter your email'); setLoading(false); return }
        if (form.password.length < 6) { setError(es ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters'); setLoading(false); return }
        if (form.password !== form.confirm) { setError(es ? 'Las contraseñas no coinciden' : 'Passwords do not match'); setLoading(false); return }
        const user = register(form.email.trim(), form.password, form.name.trim())
        onSuccess(user)
      } else {
        if (!form.email.trim() || !form.password) { setError(es ? 'Completa todos los campos' : 'Fill in all fields'); setLoading(false); return }
        const user = login(form.email.trim(), form.password)
        onSuccess(user)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <div className={styles.leftInner}>
          <div className={styles.logo}>
            <svg width="48" height="48" viewBox="0 0 200 200" fill="none">
              <path d="M40 40 C40 40 40 10 80 10 C120 10 140 40 140 70 C140 100 110 110 80 110 L40 110 Z" fill="#1a2340"/>
              <path d="M40 110 L40 160 C40 160 40 190 70 190 C100 190 110 165 110 150 C110 135 95 110 80 110 Z" fill="#1a2340"/>
              <circle cx="148" cy="158" r="28" fill="#2ec4a0"/>
            </svg>
            <span className={styles.logoText}>Fundalo</span>
          </div>
          <h1 className={styles.heroTitle}>
            {es ? 'Tu negocio merece capital.' : 'Your business deserves capital.'}
          </h1>
          <p className={styles.heroBody}>
            {es
              ? 'Fundalo convierte tus transacciones de Zelle, Venmo y efectivo en un Fondo Rating profesional — tu pasaporte al financiamiento.'
              : 'Fundalo turns your Zelle, Venmo, and cash transactions into a professional Fondo Rating — your passport to financing.'}
          </p>
          <div className={styles.benefits}>
            {[
              { icon: '🔍', text: es ? 'Detectamos tus ingresos de negocio automáticamente' : 'We detect your business income automatically' },
              { icon: '📊', text: es ? 'Genera tu Fondo Rating en minutos' : 'Generate your Fondo Rating in minutes' },
              { icon: '💰', text: es ? 'Conecta con grants y préstamos que calificas' : 'Connect with grants and loans you qualify for' },
            ].map((b, i) => (
              <div key={i} className={styles.benefit}>
                <span className={styles.benefitIcon}>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.formCard}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: '0 0 1rem', fontFamily: 'var(--font)', textAlign: 'left', display: 'block' }}>← {lang === 'es' ? 'Volver' : 'Back'}</button>
        <div className={styles.formLogo}>
            <svg width="32" height="32" viewBox="0 0 200 200" fill="none">
              <path d="M40 40 C40 40 40 10 80 10 C120 10 140 40 140 70 C140 100 110 110 80 110 L40 110 Z" fill="#1a2340"/>
              <path d="M40 110 L40 160 C40 160 40 190 70 190 C100 190 110 165 110 150 C110 135 95 110 80 110 Z" fill="#1a2340"/>
              <circle cx="148" cy="158" r="28" fill="#2ec4a0"/>
            </svg>
            <span className={styles.formLogoText}>Fundalo</span>
          </div>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setMode('login'); setError('') }}>
              {es ? 'Iniciar sesión' : 'Sign in'}
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => { setMode('register'); setError('') }}>
              {es ? 'Crear cuenta' : 'Create account'}
            </button>
          </div>

          <div className={styles.fields}>
            {mode === 'register' && (
              <div className={styles.field}>
                <label className="label">{es ? 'Tu nombre completo' : 'Full name'}</label>
                <input className="input" placeholder="Rosa Martinez"
                  value={form.name} onChange={e => set('name', e.target.value)}
                  onKeyDown={handleKeyDown} autoFocus />
              </div>
            )}
            <div className={styles.field}>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="rosa@email.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                onKeyDown={handleKeyDown} autoFocus={mode === 'login'} />
            </div>
            <div className={styles.field}>
              <label className="label">{es ? 'Contraseña' : 'Password'}</label>
              <input className="input" type="password"
                placeholder={mode === 'register' ? (es ? 'Mínimo 6 caracteres' : 'At least 6 characters') : '••••••••'}
                value={form.password} onChange={e => set('password', e.target.value)}
                onKeyDown={handleKeyDown} />
            </div>
            {mode === 'register' && (
              <div className={styles.field}>
                <label className="label">{es ? 'Confirmar contraseña' : 'Confirm password'}</label>
                <input className="input" type="password" placeholder="••••••••"
                  value={form.confirm} onChange={e => set('confirm', e.target.value)}
                  onKeyDown={handleKeyDown} />
              </div>
            )}
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ marginTop: '1.25rem', opacity: loading ? 0.7 : 1 }}>
            {loading
              ? (es ? 'Cargando...' : 'Loading...')
              : mode === 'login'
                ? (es ? 'Iniciar sesión →' : 'Sign in →')
                : (es ? 'Crear cuenta →' : 'Create account →')
            }
          </button>

          <div className={styles.divider}>
            <span>{es ? 'o continúa como invitado' : 'or continue as guest'}</span>
          </div>

          <button className="btn-ghost" onClick={() => onSuccess(null)}>
            {es ? 'Probar sin cuenta →' : 'Try without account →'}
          </button>

          <p className={styles.legal}>
            {es
              ? 'Tus datos se guardan localmente en tu dispositivo. No compartimos tu información.'
              : 'Your data is saved locally on your device. We never share your information.'}
          </p>
        </div>
      </div>
    </div>
  )
}
