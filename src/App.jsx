import { useState } from 'react'
import Landing from './components/Landing'
import Intake from './components/Intake'
import Dashboard from './components/Dashboard'
import FondoReport from './components/FondoReport'
import { MOCK_PROFILE } from './data/mockTransactions'

export default function App() {
  const [screen, setScreen] = useState('landing')
  const [lang, setLang] = useState('en')
  const [profile, setProfile] = useState(null)
  const [report, setReport] = useState(null)
  const [classified, setClassified] = useState(null)

  function handleIntakeComplete(formData) {
    setProfile(formData)
    setScreen('dashboard')
  }

  function handleDashboardContinue(reportData, classifiedTx) {
    setReport(reportData)
    setClassified(classifiedTx)
    setScreen('report')
  }

  if (screen === 'landing') {
    return <Landing onStart={() => setScreen('intake')} lang={lang} setLang={setLang} />
  }

  if (screen === 'intake') {
    return (
      <div>
        <Intake
          onComplete={handleIntakeComplete}
          onBack={() => setScreen('landing')}
          lang={lang}
          setLang={setLang}
        />
        <div style={{ textAlign: 'center', paddingBottom: '2rem' }}>
          <button
            onClick={() => { setProfile(MOCK_PROFILE); setScreen('dashboard') }}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: 12,
              cursor: 'pointer', textDecoration: 'underline',
              fontFamily: 'var(--font)', fontWeight: 600
            }}
          >
            {lang === 'en' ? "Skip — use Rosa's demo data" : "Saltar — usar datos de Rosa"}
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'dashboard') {
    return (
      <Dashboard
        profile={profile}
        lang={lang}
        setLang={setLang}
        onContinue={handleDashboardContinue}
      />
    )
  }

  if (screen === 'report') {
    return (
      <FondoReport
        profile={profile}
        report={report}
        classified={classified}
        lang={lang}
        onBack={() => setScreen('dashboard')}
      />
    )
  }
}
