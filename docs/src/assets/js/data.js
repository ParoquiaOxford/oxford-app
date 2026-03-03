const fetchJson = async (path) => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Falha ao buscar ${path}`)
  }
  return response.json()
}

const ensureArray = (value, fileName) => {
  if (!Array.isArray(value)) {
    throw new Error(`Formato inválido em ${fileName}`)
  }
  return value
}

const CUSTOM_REPERTORY_KEY = 'oxford.customRepertory'

export const loadUsers = async () => {
  const users = await fetchJson('./data/users.json')
  return ensureArray(users, 'users.json')
}

export const loadCategories = async () => {
  const categories = await fetchJson('./data/category.json')
  return ensureArray(categories, 'category.json')
}

export const loadRepertory = async () => {
  const repertory = await fetchJson('./data/repertory.json')
  return ensureArray(repertory, 'repertory.json')
}

export const loadCustomRepertory = () => {
  const raw = localStorage.getItem(CUSTOM_REPERTORY_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return ensureArray(parsed, 'customRepertory')
  } catch {
    return []
  }
}

export const saveCustomRepertory = (songs) => {
  localStorage.setItem(CUSTOM_REPERTORY_KEY, JSON.stringify(songs))
}