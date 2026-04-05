import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from './api'

const AuthContext = createContext(null)

async function authFetch(pathname, body) {
  return apiFetch(pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('fundalo_user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {}
    }
    setLoading(false)
  }, [])

  function storeSession(nextUser) {
    localStorage.setItem('fundalo_user', JSON.stringify(nextUser))
    setUser(nextUser)
    return nextUser
  }

  async function register(email, password, name) {
    const payload = await authFetch('/api/auth/register', { email, password, name })
    return storeSession(payload.user)
  }

  async function login(email, password) {
    const payload = await authFetch('/api/auth/login', { email, password })
    return storeSession(payload.user)
  }

  async function forgotPassword(email) {
    return authFetch('/api/auth/forgot-password', { email })
  }

  async function resetPassword(email, token, password) {
    const payload = await authFetch('/api/auth/reset-password', { email, token, password })
    return storeSession(payload.user)
  }

  function logout() {
    localStorage.removeItem('fundalo_user')
    setUser(null)
  }

  async function saveUserData(profile, report, classified) {
    if (!user) return
    const payload = await authFetch('/api/auth/save-user-data', {
      userId: user.id,
      profile,
      report,
      classified,
    })
    storeSession(payload.user)
  }

  function getUserData() {
    return user
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        saveUserData,
        getUserData,
        forgotPassword,
        resetPassword,
      }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
