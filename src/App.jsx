import { useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Landing from './components/Landing'
import Auth from './components/Auth'
import Account from './components/Account'
import Intake from './components/Intake'
import Dashboard from './components/Dashboard'
import FondoReport from './components/FondoReport'

function AppInner() {
  const { user, saveUserData } = useAuth()
  const [screen, setScreen] = useState('landing')
  const [lang, setLang] = useState('en')
  const [profile, setProfile] = useState(null)
  const [report, setReport] = useState(null)
  const [classified, setClassified] = useState(null)

  function handleAuthSuccess(authUser) {
    setScreen(authUser ? 'account' : 'intake')
  }

  function handleIntakeComplete(formData) {
    setProfile(formData)
    setScreen('dashboard')
  }

  function handleDashboardContinue(reportData, classifiedTx) {
    setReport(reportData)
    setClassified(classifiedTx)
    if (user) saveUserData(profile, reportData, classifiedTx)
    setScreen('report')
  }

  function handleViewSavedReport(savedProfile, savedReport, savedClassified) {
    setProfile(savedProfile)
    setReport(savedReport)
    setClassified(savedClassified)
    setScreen('report')
  }

  if (screen === 'landing') {
    return (
      <Landing
        onStart={() => setScreen('auth')}
        lang={lang}
        setLang={setLang}
        onAccount={() => user ? setScreen('account') : setScreen('auth')}
        user={user}
      />
    )
  }

  if (screen === 'auth') {
    return <Auth onSuccess={handleAuthSuccess} lang={lang} onBack={() => setScreen('landing')} />
  }

  if (screen === 'account') {
    return (
      <Account
        lang={lang}
        onStartNew={() => setScreen('intake')}
        onViewReport={handleViewSavedReport}
        onBack={() => setScreen('landing')}
      />
    )
  }

  if (screen === 'intake') {
    return (
      <div>
        <Intake
          onComplete={handleIntakeComplete}
          onBack={() => setScreen(user ? 'account' : 'landing')}
          lang={lang}
          setLang={setLang}
        />
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
        onBack={() => setScreen('intake')}
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

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
