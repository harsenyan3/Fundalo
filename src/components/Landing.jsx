import styles from './Landing.module.css'

const STATS = [
  { num: '5M+', label: 'Latino SMBs in the US', labelEs: 'Negocios Latinos en EEUU' },
  { num: '44%', label: 'Faster growth than average', labelEs: 'Más rápido que el promedio' },
  { num: '$50B+', label: 'In grants go unclaimed', labelEs: 'En grants sin reclamar' },
]

const HOW = [
  { step: '01', icon: '💳', en: { title: 'Connect your finances', body: 'Link your bank and add Zelle or cash activity. No credit check.' }, es: { title: 'Conecta tus finanzas', body: 'Vincula tu banco y agrega actividad de Zelle o efectivo. Sin verificación de crédito.' } },
  { step: '02', icon: '🔍', en: { title: 'AI classifies your transactions', body: 'We separate business income from personal expenses, even in shared accounts.' }, es: { title: 'IA clasifica tus transacciones', body: 'Separamos ingresos del negocio de gastos personales, incluso en cuentas compartidas.' } },
  { step: '03', icon: '📊', en: { title: 'Get your Fundo Rating', body: 'A professional report in English for lenders. Your dashboard in Spanish for you.' }, es: { title: 'Obtén tu Fundo Rating', body: 'Reporte profesional en inglés para prestamistas. Dashboard en español para ti.' } },
  { step: '04', icon: '🚀', en: { title: 'Apply for funding', body: 'Matched grants and loans with AI-drafted applications ready to submit.' }, es: { title: 'Solicita financiamiento', body: 'Grants y préstamos con solicitudes redactadas por IA, listas para enviar.' } },
]

const TEAM = [
  {
    name: 'Hayk Arsenyan',
    role: 'Computer Science @ Georgia Tech',
    linkedin: 'https://www.linkedin.com/in/haykarsenyan/',
  },
  {
    name: 'Luis Camilo Vélez',
    role: 'ISyE @ Georgia Tech',
    linkedin: 'https://www.linkedin.com/in/lcvr/',
  },
  {
    name: 'Santiago Aramayo',
    role: 'ISyE @ Georgia Tech',
    linkedin: 'https://www.linkedin.com/in/santiago-aramayo/',
  },
]

const FundaloLogo = ({ size = 36, navyFill = '#1a2340' }) => (
  <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
    <path d="M40 40 C40 40 40 10 80 10 C120 10 140 40 140 70 C140 100 110 110 80 110 L40 110 Z" fill={navyFill}/>
    <path d="M40 110 L40 160 C40 160 40 190 70 190 C100 190 110 165 110 150 C110 135 95 110 80 110 Z" fill={navyFill}/>
    <circle cx="148" cy="158" r="28" fill="#2ec4a0"/>
  </svg>
)

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

export default function Landing({ onStart, lang, setLang, onAccount, user }) {
  const es = lang === 'es'

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo} onClick={scrollToTop} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && scrollToTop()}>
            <FundaloLogo size={32} />
            <span className={styles.logoText}>Fundalo</span>
          </div>
          <div className={styles.navRight}>
            <button className={styles.navLink} onClick={() => scrollTo('how')}>
              {es ? 'Cómo funciona' : 'How it works'}
            </button>
            <button className={styles.navLink} onClick={() => scrollTo('about')}>
              {es ? 'Nosotros' : 'About'}
            </button>
            <div className={styles.langPill}>
              <button className={lang === 'en' ? styles.langOn : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'es' ? styles.langOn : ''} onClick={() => setLang('es')}>ES</button>
            </div>
            <button className={styles.accountBtn} onClick={onAccount}>
              {user ? `👤 ${user.name?.split(' ')[0] || 'Account'}` : (es ? 'Iniciar sesión' : 'Sign in')}
            </button>
          </div>
        </div>
      </nav>

      <section id="hero" className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            {es ? '🌟 Construido para negocios Latinos' : '🌟 Built for Latino-owned businesses'}
          </div>
          <h1 className={styles.heroTitle}>
            {es
              ? <>{`Tu negocio trabaja.`}<br /><span className={styles.heroAccent}>Fundalo lo demuestra.</span></>
              : <>{`Your business works.`}<br /><span className={styles.heroAccent}>Fundalo proves it.</span></>
            }
          </h1>
          <p className={styles.heroSub}>
            {es
              ? 'Transformamos tus pagos bancarios, de Zelle y de efectivo en un Fundo Rating profesional. Sin historial en bureaus.'
              : 'We turn your bank, Zelle, and cash payments into a professional Fundo Rating. No bureau history needed.'}
          </p>
          <div className={styles.heroActions}>
            <button className={styles.heroCta} onClick={onStart}>
              {es ? 'Comenzar gratis →' : 'Get started free →'}
            </button>
            <button className={styles.heroLearn} onClick={() => scrollTo('how')}>
              {es ? 'Ver cómo funciona ↓' : 'See how it works ↓'}
            </button>
          </div>
          <div className={styles.heroStats}>
            {STATS.map(s => (
              <div key={s.num} className={styles.heroStat}>
                <div className={styles.heroStatNum}>{s.num}</div>
                <div className={styles.heroStatLabel}>{es ? s.labelEs : s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.mockCard}>
            <div className={styles.mockHeader}>
              <div className={styles.mockDots}><span/><span/><span/></div>
              <span className={styles.mockTitle}>Fundo Rating Report</span>
            </div>
            <div className={styles.mockGrade}>FR-B</div>
            <div className={styles.mockLabel}>Creditworthy</div>
            <div className={styles.mockStats}>
              <div><div className={styles.mockVal} style={{ color: '#2ec4a0' }}>$6,840</div><div className={styles.mockStatLabel}>Monthly Revenue</div></div>
              <div><div className={styles.mockVal}>$22K–$36K</div><div className={styles.mockStatLabel}>Loan Range</div></div>
            </div>
            <div className={styles.mockBar}><div className={styles.mockBarFill} /></div>
            <div className={styles.mockClients}>
              <div className={styles.mockClient}>✓ Green Valley HOA</div>
              <div className={styles.mockClient}>✓ Patricia Homes LLC</div>
              <div className={styles.mockClient}>✓ Sunrise Properties</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problemBanner}>
        <div className={styles.problemInner}>
          <span className={styles.problemIcon}>⚠️</span>
          <div>
            <strong>{es ? 'El sistema está roto para nosotros. ' : 'The system is broken for us. '}</strong>
            {es
              ? '60% de los negocios Latinos operan en Zelle y efectivo. Los bancos los llaman "sin historial". Fundalo los llama solventes.'
              : '60% of Latino businesses operate in cash and Zelle. Banks call them "unbanked." Fundalo calls them creditworthy.'}
          </div>
        </div>
      </section>

      <section className={styles.how} id="how">
        <div className={styles.sectionInner}>
          <div className={styles.sectionBadge}>{es ? 'Cómo funciona' : 'How it works'}</div>
          <h2 className={styles.sectionTitle}>
            {es ? 'De invisible a financiable en 4 pasos' : 'From invisible to fundable in 4 steps'}
          </h2>
          <div className={styles.howGrid}>
            {HOW.map(h => (
              <div key={h.step} className={styles.howCard}>
                <div className={styles.howStep}>{h.step}</div>
                <div className={styles.howIcon}>{h.icon}</div>
                <div className={styles.howTitle}>{es ? h.es.title : h.en.title}</div>
                <div className={styles.howBody}>{es ? h.es.body : h.en.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <div className={styles.sectionInner}>
          <div className={styles.featureGrid}>
            {[
              { emoji: '🔍', title: es ? 'Detecta dinero fantasma' : 'Ghost money detection', body: es ? 'Identificamos efectivo y retiros ATM no rastreados.' : 'We flag untracked cash and ATM withdrawals.', color: '#1a2340', bg: '#eef1f6' },
              { emoji: '🤖', title: es ? 'IA clasifica transacciones' : 'AI classifies transactions', body: es ? 'Separa ingresos de negocio de gastos personales automáticamente.' : 'Separates business income from personal expenses automatically.', color: '#065f46', bg: '#e8faf5' },
              { emoji: '📄', title: es ? 'Reporte bilingüe' : 'Bilingual report', body: es ? 'Dashboard en español para ti. Reporte profesional en inglés para el banco.' : 'Spanish dashboard for you. English report for the bank.', color: '#5b21b6', bg: '#f5f3ff' },
              { emoji: '💰', title: es ? 'Matching de grants' : 'Grant & loan matching', body: es ? 'Te conectamos con fondos para los que calificas.' : 'We connect you with funds you qualify for.', color: '#92400e', bg: '#fffbeb' },
            ].map(f => (
              <div key={f.title} className={styles.featureCard} style={{ background: f.bg }}>
                <div className={styles.featureEmoji}>{f.emoji}</div>
                <h3 className={styles.featureTitle} style={{ color: f.color }}>{f.title}</h3>
                <p className={styles.featureBody} style={{ color: f.color, opacity: 0.8 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.about} id="about">
        <div className={styles.sectionInner}>
          <div className={styles.sectionBadge}>{es ? 'Sobre nosotros' : 'About us'}</div>
          <h2 className={styles.sectionTitle}>{es ? 'Construido en Georgia Tech' : 'Built at Georgia Tech'}</h2>
          <p className={styles.aboutBody}>
            {es
              ? "Fundalo nació en el SHPE Vibra ATL Hackathon 2026. Somos un equipo que vio de primera mano cómo los negocios Latinos son invisibles para el sistema financiero — y decidimos cambiar eso."
              : "Fundalo was born at the SHPE Vibra ATL Hackathon 2026. We're a team that saw firsthand how Latino businesses are invisible to the financial system — and decided to change that."}
          </p>
          <div className={styles.teamGrid}>
            {TEAM.map((member) => (
              <div key={member.name} className={styles.teamCard}>
                <div className={styles.teamName}>{member.name}</div>
                <div className={styles.teamRole}>{member.role}</div>
                <a className={styles.teamLink} href={member.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <FundaloLogo size={48} />
          <h2 className={styles.ctaTitle}>{es ? '¿Listo para ser financiable?' : 'Ready to become fundable?'}</h2>
          <p className={styles.ctaSub}>{es ? 'Gratis. Sin verificación de crédito. Resultados en 2 minutos.' : 'Free. No credit check. Results in 2 minutes.'}</p>
          <button className={styles.ctaBtn} onClick={onStart}>{es ? 'Comenzar ahora →' : 'Start now →'}</button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.logo} onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <FundaloLogo size={24} navyFill="#ffffff" />
            <span className={styles.footerBrand}>Fundalo<sup>TM</sup></span>
          </div>
          <p className={styles.footerText}>{es ? 'Copyright 2026 Fundalo TM. Construido para la comunidad Latina.' : 'Copyright 2026 Fundalo TM. Built for the Latino community.'}</p>
        </div>
      </footer>
    </div>
  )
}
