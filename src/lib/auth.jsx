import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('fundalo_user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  function register(email, password, name) {
    const users = JSON.parse(localStorage.getItem('fundalo_users') || '[]')
    if (users.find(u => u.email === email)) {
      throw new Error('An account with this email already exists')
    }
    const newUser = {
      id: Date.now().toString(),
      email,
      name,
      createdAt: new Date().toISOString(),
      profile: null,
      report: null,
      classified: null,
      lastUpdated: null,
    }
    const hashed = btoa(password + '_fundalo_salt')
    users.push({ ...newUser, password: hashed })
    localStorage.setItem('fundalo_users', JSON.stringify(users))
    const { password: _, ...userWithoutPass } = { ...newUser, password: hashed }
    const sessionUser = newUser
    localStorage.setItem('fundalo_user', JSON.stringify(sessionUser))
    setUser(sessionUser)
    return sessionUser
  }

  function login(email, password) {
    const users = JSON.parse(localStorage.getItem('fundalo_users') || '[]')
    const hashed = btoa(password + '_fundalo_salt')
    const found = users.find(u => u.email === email && u.password === hashed)
    if (!found) throw new Error('Incorrect email or password')
    const { password: _, ...sessionUser } = found
    localStorage.setItem('fundalo_user', JSON.stringify(sessionUser))
    setUser(sessionUser)
    return sessionUser
  }

  function logout() {
    localStorage.removeItem('fundalo_user')
    setUser(null)
  }

  function saveUserData(profile, report, classified) {
    if (!user) return
    const users = JSON.parse(localStorage.getItem('fundalo_users') || '[]')
    const updated = users.map(u => {
      if (u.id === user.id) {
        return { ...u, profile, report, classified, lastUpdated: new Date().toISOString() }
      }
      return u
    })
    localStorage.setItem('fundalo_users', JSON.stringify(updated))
    const updatedUser = { ...user, profile, report, classified, lastUpdated: new Date().toISOString() }
    localStorage.setItem('fundalo_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  function getUserData() {
    if (!user) return null
    const users = JSON.parse(localStorage.getItem('fundalo_users') || '[]')
    const found = users.find(u => u.id === user.id)
    if (!found) return null
    const { password: _, ...data } = found
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, saveUserData, getUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
