import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import styles from './Auth.module.css'

export default function Auth({ onSuccess, lang, onBack, resetEmail = '', resetToken = '', onClearReset }) {
  const [mode, setMode] = useState(resetToken ? 'reset' : 'login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register, forgotPassword, resetPassword } = useAuth()

  const es = lang === 'es'

  useEffect(() => {
    if (resetToken) {
      setMode('reset')
      setForm((prev) => ({ ...prev, email: resetEmail || prev.email }))
      setInfo(es ? 'Elige una nueva contraseña para tu cuenta.' : 'Choose a new password for your account.')
      setError('')
    }
  }, [es, resetEmail, resetToken])

  function set(key, val) {
    setForm(p => ({ ...p, [key]: val }))
    setError('')
    setInfo('')
  }

  async function handleSubmit() {
    setError('')
    setInfo('')
    setPreviewUrl('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!form.name.trim()) { setError(es ? 'Ingresa tu nombre' : 'Enter your name'); setLoading(false); return }
        if (!form.email.trim()) { setError(es ? 'Ingresa tu email' : 'Enter your email'); setLoading(false); return }
        if (form.password.length < 6) { setError(es ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters'); setLoading(false); return }
        if (form.password !== form.confirm) { setError(es ? 'Las contraseñas no coinciden' : 'Passwords do not match'); setLoading(false); return }
        const user = await register(form.email.trim(), form.password, form.name.trim())
        onSuccess(user)
      } else if (mode === 'forgot') {
        if (!form.email.trim()) { setError(es ? 'Ingresa tu email' : 'Enter your email'); setLoading(false); return }
        const payload = await forgotPassword(form.email.trim())
        setInfo(payload.message || (es ? 'Revisa tu correo para continuar.' : 'Check your email for next steps.'))
        setPreviewUrl(payload.previewUrl || '')
      } else if (mode === 'reset') {
        if (!form.email.trim()) { setError(es ? 'Ingresa tu email' : 'Enter your email'); setLoading(false); return }
        if (form.password.length < 6) { setError(es ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters'); setLoading(false); return }
        if (form.password !== form.confirm) { setError(es ? 'Las contraseñas no coinciden' : 'Passwords do not match'); setLoading(false); return }
        const user = await resetPassword(form.email.trim(), resetToken, form.password)
        setInfo(es ? 'Contraseña actualizada correctamente.' : 'Password updated successfully.')
        onClearReset?.()
        onSuccess(user)
      } else {
        if (!form.email.trim() || !form.password) { setError(es ? 'Completa todos los campos' : 'Fill in all fields'); setLoading(false); return }
        const user = await login(form.email.trim(), form.password)
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
              ? 'Fundalo convierte tus transacciones bancarias, de Zelle y de efectivo en un Fundo Rating profesional — tu pasaporte al financiamiento.'
              : 'Fundalo turns your bank, Zelle, and cash transactions into a professional Fundo Rating — your passport to financing.'}
          </p>
          <div className={styles.benefits}>
            {[
              { icon: '🔍', text: es ? 'Detectamos tus ingresos de negocio automáticamente' : 'We detect your business income automatically' },
              { icon: '📊', text: es ? 'Genera tu Fundo Rating en minutos' : 'Generate your Fundo Rating in minutes' },
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
              className={`${styles.tab} ${mode !== 'register' ? styles.tabActive : ''}`}
              onClick={() => { setMode('login'); setError(''); setInfo(''); setPreviewUrl(''); onClearReset?.() }}>
              {es ? 'Iniciar sesión' : 'Sign in'}
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => { setMode('register'); setError(''); setInfo(''); setPreviewUrl(''); onClearReset?.() }}>
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
                onKeyDown={handleKeyDown} autoFocus={mode !== 'register'} />
            </div>
            {mode !== 'forgot' && (
              <div className={styles.field}>
                <label className="label">{es ? 'Contraseña' : 'Password'}</label>
                <input className="input" type="password"
                  placeholder={mode === 'register' || mode === 'reset' ? (es ? 'Mínimo 6 caracteres' : 'At least 6 characters') : '••••••••'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  onKeyDown={handleKeyDown} />
              </div>
            )}
            {(mode === 'register' || mode === 'reset') && (
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

          {info && (
            <div className={styles.info}>
              <div>{info}</div>
              {previewUrl && (
                <a className={styles.previewLink} href={previewUrl}>
                  {es ? 'Abrir link de recuperación' : 'Open recovery link'}
                </a>
              )}
            </div>
          )}

          {mode === 'login' && (
            <button
              className={styles.inlineLink}
              onClick={() => {
                setMode('forgot')
                setError('')
                setInfo('')
                setPreviewUrl('')
              }}>
              {es ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
            </button>
          )}

          {mode !== 'login' && !resetToken && (
            <button
              className={styles.inlineLink}
              onClick={() => {
                setMode('login')
                setError('')
                setInfo('')
                setPreviewUrl('')
              }}>
              {es ? 'Volver a iniciar sesión' : 'Back to sign in'}
            </button>
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
                : mode === 'forgot'
                  ? (es ? 'Enviar correo de recuperación →' : 'Send recovery email →')
                  : mode === 'reset'
                    ? (es ? 'Actualizar contraseña →' : 'Update password →')
                : (es ? 'Crear cuenta →' : 'Create account →')
            }
          </button>

          {mode !== 'forgot' && mode !== 'reset' && (
            <>
              <div className={styles.divider}>
                <span>{es ? 'o continúa como invitado' : 'or continue as guest'}</span>
              </div>

              <button className="btn-ghost" onClick={() => onSuccess(null)}>
                {es ? 'Probar sin cuenta →' : 'Try without account →'}
              </button>
            </>
          )}

          <p className={styles.legal}>
            {es
              ? 'Tus datos se guardan en tu cuenta y la sesión permanece en este navegador hasta que cierres sesión.'
              : 'Your account data is stored for sign-in, and your session stays in this browser until you sign out.'}
          </p>
        </div>
      </div>
    </div>
  )
}
