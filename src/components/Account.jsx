import { useAuth } from '../lib/auth'
import styles from './Account.module.css'

function getFundoRating(score) {
  if (!score) return null
  if (score >= 85) return { grade: 'FR-A', label: 'Lender Ready', color: '#2ec4a0', bg: '#e8faf5' }
  if (score >= 70) return { grade: 'FR-B', label: 'Creditworthy', color: '#1a2340', bg: '#eef1f6' }
  if (score >= 55) return { grade: 'FR-C', label: 'Emerging', color: '#d97706', bg: '#fffbeb' }
  if (score >= 40) return { grade: 'FR-D', label: 'Early Stage', color: '#ea580c', bg: '#fff7ed' }
  return { grade: 'FR-E', label: 'Needs History', color: '#dc2626', bg: '#fef2f2' }
}

export default function Account({ lang, onStartNew, onViewReport, onBack }) {
  const { user, logout, getUserData } = useAuth()
  const es = lang === 'es'
  const data = getUserData()
  const rating = data?.report ? getFundoRating(data.report.reliabilityScore) : null

  function handleLogout() {
    logout()
    onBack()
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U'
  const assetSummary = Array.isArray(data?.profile?.assets) && data.profile.assets.length > 0
    ? data.profile.assets.map((asset) => asset.description || asset).join(', ')
    : (es ? 'Ninguno' : 'None')

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <div className={styles.navInner}>
          <div
            className={styles.logo}
            onClick={onBack}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                onBack()
              }
            }}>
            <svg width="28" height="28" viewBox="0 0 200 200" fill="none">
              <path d="M40 40 C40 40 40 10 80 10 C120 10 140 40 140 70 C140 100 110 110 80 110 L40 110 Z" fill="#1a2340"/>
              <path d="M40 110 L40 160 C40 160 40 190 70 190 C100 190 110 165 110 150 C110 135 95 110 80 110 Z" fill="#1a2340"/>
              <circle cx="148" cy="158" r="28" fill="#2ec4a0"/>
            </svg>
            <span className={styles.logoText}>Fundalo</span>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            {es ? 'Cerrar sesión' : 'Sign out'}
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.profileSection}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <h1 className={styles.userName}>{user?.name || user?.email}</h1>
            <p className={styles.userEmail}>{user?.email}</p>
            {data?.lastUpdated && (
              <p className={styles.lastUpdated}>
                {es ? 'Última actualización' : 'Last updated'}:{' '}
                {new Date(data.lastUpdated).toLocaleDateString(es ? 'es-US' : 'en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>

        {rating && data?.report ? (
          <>
            <div className={styles.ratingCard} style={{ background: rating.bg }}>
              <div className={styles.ratingLeft}>
                <div className={styles.ratingGrade} style={{ color: rating.color }}>{rating.grade}</div>
                <div className={styles.ratingLabel} style={{ color: rating.color }}>{rating.label}</div>
                <div className={styles.ratingDesc}>{es ? 'Tu Fundo Rating' : 'Your Fundo Rating'}</div>
              </div>
              <div className={styles.ratingStats}>
                <div className={styles.stat}>
                  <div className={styles.statVal} style={{ color: '#2ec4a0' }}>${data.report.monthlyRevenue?.toLocaleString()}</div>
                  <div className={styles.statLabel}>{es ? 'Ingreso mensual' : 'Monthly revenue'}</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statVal} style={{ color: rating.color }}>${data.report.loanMin?.toLocaleString()} – ${data.report.loanMax?.toLocaleString()}</div>
                  <div className={styles.statLabel}>{es ? 'Rango de préstamo' : 'Loan range'}</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statVal}>{data.report.reliabilityScore}/100</div>
                  <div className={styles.statLabel}>{es ? 'Puntaje' : 'Score'}</div>
                </div>
              </div>
            </div>

            <div className={styles.actions}>
              <button className="btn-primary" onClick={() => onViewReport(data.profile, data.report, data.classified)}>
                {es ? '📄 Ver mi Fundo Rating Report →' : '📄 View my Fundo Rating Report →'}
              </button>
              <button className="btn-ghost" onClick={onStartNew}>
                {es ? '🔄 Actualizar mi información' : '🔄 Update my information'}
              </button>
            </div>

            {data.profile && (
              <div className={styles.profileInfo}>
                <div className={styles.infoTitle}>{es ? 'Información del negocio' : 'Business information'}</div>
                <div className={styles.infoGrid}>
                  {[
                    { label: es ? 'Negocio' : 'Business', val: data.profile.businessName },
                    { label: es ? 'Industria' : 'Industry', val: data.profile.industry },
                    { label: es ? 'Años operando' : 'Years operating', val: data.profile.yearsOperating },
                    { label: es ? 'Rango de precios' : 'Price range', val: data.profile.priceMin && data.profile.priceMax ? `$${data.profile.priceMin} – $${data.profile.priceMax}` : 'N/A' },
                    { label: es ? 'Tipo de cuenta' : 'Account type', val: data.profile.accountType === 'shared' ? (es ? 'Mixta' : 'Mixed') : (es ? 'Solo negocio' : 'Business only') },
                    { label: es ? 'Activos' : 'Assets', val: assetSummary },
                  ].map(item => (
                    <div key={item.label} className={styles.infoRow}>
                      <span className={styles.infoLabel}>{item.label}</span>
                      <span className={styles.infoVal}>{item.val || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📊</div>
            <h2 className={styles.emptyTitle}>
              {es ? 'Aun no tienes un Fundo Rating' : "You don't have a Fundo Rating yet"}
            </h2>
            <p className={styles.emptyBody}>
              {es
                ? 'Completa tu perfil y analiza tus transacciones para generar tu reporte de crédito.'
                : 'Complete your profile and analyze your transactions to generate your credit report.'}
            </p>
            <button className="btn-primary" onClick={onStartNew} style={{ maxWidth: 320, margin: '0 auto' }}>
              {es ? 'Generar mi Fundo Rating →' : 'Generate my Fundo Rating →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
