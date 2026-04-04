import styles from './Landing.module.css'

const STATS = [
  { num: '5M+', label: 'Latino SMBs in the US' },
  { num: '44%', label: 'Faster growth than average' },
  { num: '$50B+', label: 'In grants go unclaimed' },
]

const HOW = [
  { step: '01', icon: '💳', title: 'Connect your finances', body: 'Link your bank, upload Zelle and Venmo history. No credit check required.' },
  { step: '02', icon: '🔍', title: 'We find your business transactions', body: 'Our AI separates business income from personal expenses — even in shared accounts.' },
  { step: '03', icon: '📊', title: 'Get your Credit Passport', body: 'A professional report in English for lenders. A personal dashboard in Spanish for you.' },
  { step: '04', icon: '🚀', title: 'Apply for funding', body: 'Matched grants and loans with AI-drafted applications ready to submit.' },
]

const TEAM = [
  { initials: 'HM', name: 'Hayk Mkrtchyan', role: 'Engineering Lead', color: '#2563eb' },
  { initials: 'KR', name: 'Kenneth Rivera', role: 'Product & Data', color: '#059669' },
  { initials: 'AL', name: 'Ana Lopez', role: 'Pitch & Strategy', color: '#7c3aed' },
]

export default function Landing({ onStart, lang, setLang }) {
  const es = lang === 'es'

  return (
    <div className={styles.page}>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>F</div>
            <span className={styles.logoText}>Fundalo</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how">{es ? 'Cómo funciona' : 'How it works'}</a>
            <a href="#about">{es ? 'Nosotros' : 'About'}</a>
            <div className={styles.langPill}>
              <button className={lang === 'en' ? styles.langOn : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'es' ? styles.langOn : ''} onClick={() => setLang('es')}>ES</button>
            </div>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          {es ? '🌟 Construido para negocios Latinos' : '🌟 Built for Latino-owned businesses'}
        </div>
        <h1 className={styles.heroTitle}>
          {es ? (
            <>Tu negocio trabaja.<br /><span className={styles.heroAccent}>Fundalo lo demuestra.</span></>
          ) : (
            <>Your business works.<br /><span className={styles.heroAccent}>Fundalo proves it.</span></>
          )}
        </h1>
        <p className={styles.heroSub}>
          {es
            ? 'Transformamos tus pagos de Zelle, Venmo y efectivo en un pasaporte de crédito profesional. Sin historial en bureaus. Sin discriminación.'
            : 'We turn your Zelle, Venmo, and cash payments into a professional credit passport. No bureau history needed. No discrimination.'}
        </p>
        <div className={styles.heroActions}>
          <button className="btn-green" onClick={onStart} style={{ width: 'auto', padding: '16px 40px', fontSize: 16 }}>
            {es ? 'Comenzar gratis →' : 'Get started free →'}
          </button>
          <a href="#how" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, marginLeft: 24 }}>
            {es ? 'Ver cómo funciona' : 'See how it works'}
          </a>
        </div>
        <div className={styles.heroStats}>
          {STATS.map(s => (
            <div key={s.num} className={styles.heroStat}>
              <div className={styles.heroStatNum}>{s.num}</div>
              <div className={styles.heroStatLabel}>{es ? translateStat(s.label) : s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.problemBanner}>
        <div className={styles.problemInner}>
          <div className={styles.problemIcon}>⚠️</div>
          <div>
            <div className={styles.problemTitle}>
              {es ? 'El sistema está roto para nosotros' : 'The system is broken for us'}
            </div>
            <div className={styles.problemBody}>
              {es
                ? '60% de los negocios Latinos operan en efectivo y Zelle. Los bancos los llaman "sin historial". Fundalo los llama bankables.'
                : '60% of Latino businesses operate in cash and Zelle. Banks call them "unbanked." Fundalo calls them bankable.'}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.how} id="how">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>{es ? 'Cómo funciona' : 'How it works'}</div>
          <h2 className={styles.sectionTitle}>
            {es ? 'De invisible a financiable en 4 pasos' : 'From invisible to fundable in 4 steps'}
          </h2>
          <div className={styles.howGrid}>
            {HOW.map(h => (
              <div key={h.step} className={styles.howCard}>
                <div className={styles.howStep}>{h.step}</div>
                <div className={styles.howIcon}>{h.icon}</div>
                <div className={styles.howTitle}>{es ? translateHow(h.title) : h.title}</div>
                <div className={styles.howBody}>{es ? translateHowBody(h.body) : h.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.sectionInner}>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard} style={{ background: 'linear-gradient(135deg, #eff4ff 0%, #dbeafe 100%)' }}>
              <div className={styles.featureEmoji}>🔍</div>
              <h3 className={styles.featureTitle} style={{ color: '#1e40af' }}>
                {es ? 'Detecta dinero fantasma' : 'Ghost money detection'}
              </h3>
              <p className={styles.featureBody} style={{ color: '#3b82f6' }}>
                {es ? 'Identificamos efectivo y retiros ATM no rastreados que podrían afectar tu perfil.' : 'We flag untracked cash and ATM withdrawals that could hurt your profile.'}
              </p>
            </div>
            <div className={styles.featureCard} style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' }}>
              <div className={styles.featureEmoji}>🤖</div>
              <h3 className={styles.featureTitle} style={{ color: '#065f46' }}>
                {es ? 'IA clasifica tus transacciones' : 'AI classifies your transactions'}
              </h3>
              <p className={styles.featureBody} style={{ color: '#059669' }}>
                {es ? 'Separa ingresos de negocio de gastos personales — incluso en cuentas mezcladas.' : 'Separates business income from personal expenses — even in mixed accounts.'}
              </p>
            </div>
            <div className={styles.featureCard} style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)' }}>
              <div className={styles.featureEmoji}>📄</div>
              <h3 className={styles.featureTitle} style={{ color: '#5b21b6' }}>
                {es ? 'Reporte bilingüe' : 'Bilingual report'}
              </h3>
              <p className={styles.featureBody} style={{ color: '#7c3aed' }}>
                {es ? 'Dashboard en español para ti. Reporte profesional en inglés para el banco.' : 'Spanish dashboard for you. Professional English report for the bank.'}
              </p>
            </div>
            <div className={styles.featureCard} style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
              <div className={styles.featureEmoji}>💰</div>
              <h3 className={styles.featureTitle} style={{ color: '#92400e' }}>
                {es ? 'Matching de grants y préstamos' : 'Grant & loan matching'}
              </h3>
              <p className={styles.featureBody} style={{ color: '#b45309' }}>
                {es ? 'Te conectamos con fondos para los que calificas — con la solicitud ya redactada.' : 'We connect you with funds you qualify for — with the application already drafted.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.about} id="about">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>{es ? 'Sobre nosotros' : 'About us'}</div>
          <h2 className={styles.sectionTitle}>
            {es ? 'Construido por estudiantes de Georgia Tech' : 'Built by Georgia Tech students'}
          </h2>
          <p className={styles.aboutBody}>
            {es
              ? 'Fundalo nació en el SHPE Vibra ATL Hackathon 2026. Somos un equipo de estudiantes que vio de primera mano cómo los negocios Latinos son invisibles para el sistema financiero — y decidimos cambiar eso.'
              : 'Fundalo was born at the SHPE Vibra ATL Hackathon 2026. We\'re a team of students who saw firsthand how Latino businesses are invisible to the financial system — and decided to change that.'}
          </p>
          <div className={styles.teamGrid}>
            {TEAM.map(t => (
              <div key={t.name} className={styles.teamCard}>
                <div className={styles.teamAvatar} style={{ background: t.color }}>{t.initials}</div>
                <div className={styles.teamName}>{t.name}</div>
                <div className={styles.teamRole}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>
            {es ? '¿Listo para ser financiable?' : 'Ready to become fundable?'}
          </h2>
          <p className={styles.ctaSub}>
            {es ? 'Gratis. Sin verificación de crédito. Resultados en menos de 2 minutos.' : 'Free. No credit check. Results in under 2 minutes.'}
          </p>
          <button className="btn-outline-white" onClick={onStart} style={{ width: 'auto', padding: '16px 48px', fontSize: 16, marginTop: '1.5rem' }}>
            {es ? 'Comenzar ahora →' : 'Start now →'}
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon} style={{ width: 28, height: 28, fontSize: 13 }}>F</div>
            <span className={styles.logoText} style={{ fontSize: 16 }}>Fundalo</span>
          </div>
          <p className={styles.footerText}>
            {es ? '© 2026 Fundalo. Construido con ❤️ para la comunidad Latina.' : '© 2026 Fundalo. Built with ❤️ for the Latino community.'}
          </p>
        </div>
      </footer>

    </div>
  )
}

function translateStat(label) {
  const map = {
    'Latino SMBs in the US': 'Negocios Latinos en EEUU',
    'Faster growth than average': 'Más rápido que el promedio',
    'In grants go unclaimed': 'En grants sin reclamar',
  }
  return map[label] || label
}

function translateHow(title) {
  const map = {
    'Connect your finances': 'Conecta tus finanzas',
    'We find your business transactions': 'Encontramos tus transacciones de negocio',
    'Get your Credit Passport': 'Obtén tu Pasaporte de Crédito',
    'Apply for funding': 'Solicita financiamiento',
  }
  return map[title] || title
}

function translateHowBody(body) {
  const map = {
    'Link your bank, upload Zelle and Venmo history. No credit check required.': 'Vincula tu banco, sube tu historial de Zelle y Venmo. Sin verificación de crédito.',
    'Our AI separates business income from personal expenses — even in shared accounts.': 'Nuestra IA separa ingresos del negocio de gastos personales — incluso en cuentas compartidas.',
    'A professional report in English for lenders. A personal dashboard in Spanish for you.': 'Un reporte profesional en inglés para prestamistas. Un dashboard personal en español para ti.',
    'Matched grants and loans with AI-drafted applications ready to submit.': 'Grants y préstamos que calificas con solicitudes redactadas por IA, listas para enviar.',
  }
  return map[body] || body
}
