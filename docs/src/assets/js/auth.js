const SESSION_KEY = 'oxford.session'

export const findUser = (users, username, password) => {
  return users.find(
    (user) =>
      String(user.username).toLowerCase() === String(username).toLowerCase() &&
      String(user.password) === String(password),
  )
}

export const saveSession = (user) => {
  const session = {
    id: user.id,
    username: user.username,
    loggedAt: new Date().toISOString(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export const getSession = () => {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.id || !parsed?.username) return null
    return parsed
  } catch {
    return null
  }
}

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY)
}

export const requireSession = (redirectTo = './signin.html') => {
  const session = getSession()
  if (!session) {
    window.location.href = redirectTo
    return null
  }
  return session
}