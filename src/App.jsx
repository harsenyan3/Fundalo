import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import Landing from './components/Landing'
import Auth from './components/Auth'
import Account from './components/Account'
import Intake from './components/Intake'
import Dashboard from './components/Dashboard'
import FondoReport from './components/FondoReport'

function AppInner() {
  const { user, saveUserData, getUserData } = useAuth()
  const [resetContext, setResetContext] = useState({ email: '', token: '' })
  const [screen, setScreen] = useState('landing')
  const [lang, setLang] = useState('en')
  const [profile, setProfile] = useState(null)
  const [report, setReport] = useState(null)
  const [classified, setClassified] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('resetToken') || ''
    const email = params.get('email') || ''

    if (token && email) {
      setResetContext({ token, email })
      setScreen('auth')
    }
  }, [])

  function clearResetContext() {
    setResetContext({ email: '', token: '' })
    window.history.replaceState({}, '', window.location.pathname)
  }

  function handleAuthSuccess(authUser) {
    clearResetContext()
    setScreen(authUser ? 'account' : 'intake')
  }

  function handleIntakeComplete(formData) {
    setProfile(formData)
    setScreen('dashboard')
  }

  function handleStartNew() {
    const savedData = getUserData()
    setProfile(savedData?.profile || null)
    setScreen('intake')
  }

  async function handleDashboardContinue(reportData, classifiedTx) {
    setReport(reportData)
    setClassified(classifiedTx)
    if (user) {
      try {
        await saveUserData(profile, reportData, classifiedTx)
      } catch (error) {
        console.error('Unable to save user data', error)
      }
    }
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
    return (
      <Auth
        onSuccess={handleAuthSuccess}
        lang={lang}
        onBack={() => {
          clearResetContext()
          setScreen('landing')
        }}
        resetEmail={resetContext.email}
        resetToken={resetContext.token}
        onClearReset={clearResetContext}
      />
    )
  }

  if (screen === 'account') {
    return (
        <Account
          lang={lang}
          onStartNew={handleStartNew}
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
          initialProfile={profile}
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
          setLang={setLang}
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
