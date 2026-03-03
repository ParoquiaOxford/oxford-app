import '../../style.css'
import { findUser, getSession, requireSession, saveSession, clearSession } from './auth.js'
import { loadUsers, loadCategories, loadRepertory, saveCustomRepertory } from './data.js'
import { generateRepertoryPptx } from './ppt.js'

const PAGE = document.body.dataset.page
const THEME_KEY = 'oxford.theme'

const getPreferredTheme = () => {
  const storedTheme = localStorage.getItem(THEME_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(THEME_KEY, theme)
}

const setupThemeToggle = () => {
  const themeToggleButton = document.getElementById('theme-toggle-btn')
  if (!themeToggleButton) return

  const updateButtonLabel = () => {
    const isDark = document.documentElement.classList.contains('dark')
    themeToggleButton.textContent = isDark ? 'Tema: Escuro' : 'Tema: Claro'
  }

  updateButtonLabel()

  themeToggleButton.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark')
    applyTheme(isDark ? 'light' : 'dark')
    updateButtonLabel()
  })
}

const showMessage = (element, message = '') => {
  if (!element) return
  if (!message) {
    element.textContent = ''
    element.classList.add('hidden')
    return
  }
  element.textContent = message
  element.classList.remove('hidden')
}

const showFormFeedback = (element, message = '', type = 'success') => {
  if (!element) return
  if (!message) {
    element.textContent = ''
    element.className = 'hidden rounded-md border px-3 py-2 text-sm'
    return
  }

  const successClass = 'rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'
  const errorClass = 'rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
  element.className = type === 'error' ? errorClass : successClass
  element.textContent = message
}

const sortSongsByCategoryOrder = (songs, categoriesMap) => {
  return [...songs].sort((a, b) => {
    const orderA = categoriesMap.get(a.idCategory)?.order ?? Number.MAX_SAFE_INTEGER
    const orderB = categoriesMap.get(b.idCategory)?.order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.title.localeCompare(b.title, 'pt-BR')
  })
}

const initHomePage = () => {
  const session = getSession()
  if (session) {
    window.location.href = './dashboard.html'
  }
}

const initSigninPage = async () => {
  const existingSession = getSession()
  if (existingSession) {
    window.location.href = './dashboard.html'
    return
  }

  const form = document.getElementById('signin-form')
  const errorElement = document.getElementById('signin-error')

  if (!form) return

  let users = []
  try {
    users = await loadUsers()
  } catch {
    showMessage(errorElement, 'Não foi possível carregar usuários. Verifique o arquivo users.json.')
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    showMessage(errorElement)

    const formData = new FormData(form)
    const username = String(formData.get('username') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!username || !password) {
      showMessage(errorElement, 'Preencha usuário e senha.')
      return
    }

    const user = findUser(users, username, password)
    if (!user) {
      showMessage(errorElement, 'Credenciais inválidas. Tente novamente.')
      return
    }

    saveSession(user)
    window.location.href = './dashboard.html'
  })
}

const renderMusicItem = (song, categoryName, isChecked) => {
  const wrapper = document.createElement('label')
  wrapper.className = 'music-item'
  wrapper.innerHTML = `
    <span class="inline-flex items-start gap-3">
      <input type="checkbox" class="mt-1 h-4 w-4 accent-amber-700" data-song-id="${song.id}" ${isChecked ? 'checked' : ''} />
      <span>
        <strong class="block text-sm text-stone-900 dark:text-stone-100">${song.title}</strong>
        <span class="text-xs text-stone-500 dark:text-stone-300">${categoryName}</span>
      </span>
    </span>
  `
  return wrapper
}

const renderSelectedMusicItem = (song, categoryName, canDelete) => {
  const wrapper = document.createElement('div')
  wrapper.className = 'music-item'
  wrapper.innerHTML = `
    <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <strong class="block text-sm text-stone-900">${song.title}</strong>
        <span class="text-xs text-stone-500 dark:text-stone-300">${categoryName}</span>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" data-action="edit">Editar</button>
        <button type="button" class="btn-secondary px-3 py-1.5 text-xs" data-action="unselect">Excluir da seleção</button>
        ${canDelete ? '<button type="button" class="btn-secondary px-3 py-1.5 text-xs" data-action="delete">Excluir</button>' : ''}
      </div>
    </div>
  `
  return wrapper
}

const initDashboardPage = async () => {
  const session = requireSession('./signin.html')
  if (!session) return

  const welcomeUser = document.getElementById('welcome-user')
  const categorySelect = document.getElementById('category-select')
  const searchInput = document.getElementById('search-input')
  const musicList = document.getElementById('music-list')
  const resultCount = document.getElementById('result-count')
  const selectedCount = document.getElementById('selected-count')
  const selectedMusicList = document.getElementById('selected-music-list')
  const selectedEmpty = document.getElementById('selected-empty')
  const generateButton = document.getElementById('generate-ppt-btn')
  const logoutButton = document.getElementById('logout-btn')
  const errorElement = document.getElementById('dashboard-error')
  const emptyElement = document.getElementById('dashboard-empty')
  const addSongForm = document.getElementById('add-song-form')
  const addSongCategory = document.getElementById('new-song-category')
  const addSongFeedback = document.getElementById('add-song-feedback')
  const submitSongButton = document.getElementById('submit-song-btn')
  const cancelEditSongButton = document.getElementById('cancel-edit-song-btn')

  if (welcomeUser) {
    welcomeUser.textContent = `Bem-vindo, ${session.username}.`
  }

  let categories = []
  let availableSongs = []
  let customSongs = []
  let editingSongId = null

  try {
    const [loadedCategories, loadedRepertory] = await Promise.all([loadCategories(), loadRepertory()])
    categories = loadedCategories
    availableSongs = loadedRepertory
  } catch {
    showMessage(errorElement, 'Erro ao carregar dados de categorias ou repertório.')
    return
  }

  const categoriesMap = new Map(categories.map((category) => [category.id, category]))

  categories
    .sort((a, b) => a.order - b.order)
    .forEach((category) => {
      if (!categorySelect) return
      const option = document.createElement('option')
      option.value = String(category.id)
      option.textContent = `${category.order}. ${category.name}`
      categorySelect.appendChild(option)

      if (addSongCategory) {
        const addOption = document.createElement('option')
        addOption.value = String(category.id)
        addOption.textContent = `${category.order}. ${category.name}`
        addSongCategory.appendChild(addOption)
      }
    })

  const getCombinedSongs = () => {
    const songMap = new Map(availableSongs.map((song) => [song.id, song]))
    customSongs.forEach((song) => {
      songMap.set(song.id, song)
    })
    return [...songMap.values()]
  }

  const getUserAddedSongIdSet = () =>
    new Set(customSongs.filter((song) => song.sourceType === 'user-added').map((song) => song.id))

  const resetSongFormState = () => {
    editingSongId = null
    if (submitSongButton) {
      submitSongButton.textContent = 'Adicionar música'
    }
    cancelEditSongButton?.classList.add('hidden')
    addSongForm?.reset()
  }

  const setEditSongFormState = (song) => {
    editingSongId = song.id
    const titleInput = document.getElementById('new-song-title')
    const letterInput = document.getElementById('new-song-letter')

    if (titleInput instanceof HTMLInputElement) {
      titleInput.value = song.title
    }
    if (addSongCategory instanceof HTMLSelectElement) {
      addSongCategory.value = String(song.idCategory)
    }
    if (letterInput instanceof HTMLTextAreaElement) {
      letterInput.value = song.letter
    }

    if (submitSongButton) {
      submitSongButton.textContent = 'Salvar edição'
    }
    cancelEditSongButton?.classList.remove('hidden')
    showFormFeedback(addSongFeedback, 'Modo edição ativo para música adicionada.')
  }

  const selectedSongIds = new Set()

  const updateSelectedCount = () => {
    if (!selectedCount) return
    selectedCount.textContent = `${selectedSongIds.size} música(s) selecionada(s)`
  }

  const renderSelectedList = () => {
    if (!selectedMusicList || !selectedEmpty) return

    selectedMusicList.innerHTML = ''

    const selectedSongs = sortSongsByCategoryOrder(
      getCombinedSongs().filter((song) => selectedSongIds.has(song.id)),
      categoriesMap,
    )
    const userAddedSongIds = getUserAddedSongIdSet()

    if (!selectedSongs.length) {
      selectedEmpty.classList.remove('hidden')
      return
    }

    selectedEmpty.classList.add('hidden')
    selectedSongs.forEach((song) => {
      const categoryName = categoriesMap.get(song.idCategory)?.name ?? 'Categoria não encontrada'
      const canDelete = userAddedSongIds.has(song.id)
      const item = renderSelectedMusicItem(song, categoryName, canDelete)

      const editButton = item.querySelector('button[data-action="edit"]')
      const unselectButton = item.querySelector('button[data-action="unselect"]')
      const deleteButton = item.querySelector('button[data-action="delete"]')

      editButton?.addEventListener('click', () => {
        setEditSongFormState(song)
      })

      unselectButton?.addEventListener('click', () => {
        selectedSongIds.delete(song.id)
        if (editingSongId === song.id) {
          resetSongFormState()
          showFormFeedback(addSongFeedback)
        }
        updateSelectedCount()
        renderList()
        renderSelectedList()
      })

      deleteButton?.addEventListener('click', () => {
        customSongs = customSongs.filter((customSong) => customSong.id !== song.id)
        selectedSongIds.delete(song.id)
        saveCustomRepertory(customSongs)
        if (editingSongId === song.id) {
          resetSongFormState()
        }
        showFormFeedback(addSongFeedback, 'Música adicionada removida com sucesso.')
        updateSelectedCount()
        renderSelectedList()
      })

      selectedMusicList.appendChild(item)
    })
  }

  const renderList = () => {
    if (!musicList) return

    showMessage(errorElement)
    showMessage(emptyElement)

    const term = String(searchInput?.value ?? '').toLowerCase().trim()
    const selectedCategory = String(categorySelect?.value ?? 'all')

    const filtered = availableSongs.filter((song) => {
      const matchesTitle = song.title.toLowerCase().includes(term)
      const matchesCategory = selectedCategory === 'all' || String(song.idCategory) === selectedCategory
      return matchesTitle && matchesCategory
    })

    const sorted = sortSongsByCategoryOrder(filtered, categoriesMap)

    musicList.innerHTML = ''
    if (!sorted.length) {
      showMessage(emptyElement, 'Nenhuma música encontrada para os filtros selecionados.')
    }

    sorted.forEach((song) => {
      const categoryName = categoriesMap.get(song.idCategory)?.name ?? 'Categoria não encontrada'
      const item = renderMusicItem(song, categoryName, selectedSongIds.has(song.id))
      const input = item.querySelector('input[type="checkbox"]')
      input?.addEventListener('change', (event) => {
        const target = event.target
        if (!(target instanceof HTMLInputElement)) return
        if (target.checked) {
          selectedSongIds.add(song.id)
        } else {
          selectedSongIds.delete(song.id)
        }
        updateSelectedCount()
        renderSelectedList()
      })
      musicList.appendChild(item)
    })

    if (resultCount) {
      resultCount.textContent = `${sorted.length} música(s) encontrada(s)`
    }
  }

  searchInput?.addEventListener('input', renderList)
  categorySelect?.addEventListener('change', renderList)
  cancelEditSongButton?.addEventListener('click', () => {
    resetSongFormState()
    showFormFeedback(addSongFeedback)
  })

  addSongForm?.addEventListener('submit', (event) => {
    event.preventDefault()
    showFormFeedback(addSongFeedback)

    const formData = new FormData(addSongForm)
    const title = String(formData.get('title') ?? '').trim()
    const letter = String(formData.get('letter') ?? '').trim()
    const idCategory = Number(formData.get('idCategory'))

    if (!title || !letter || !idCategory) {
      showFormFeedback(addSongFeedback, 'Preencha título, categoria e letra da música.', 'error')
      return
    }

    const categoryExists = categoriesMap.has(idCategory)
    if (!categoryExists) {
      showFormFeedback(addSongFeedback, 'Categoria inválida para a nova música.', 'error')
      return
    }

    if (editingSongId !== null) {
      const existingCustomIndex = customSongs.findIndex((song) => song.id === editingSongId)

      if (existingCustomIndex >= 0) {
        customSongs = customSongs.map((song) => {
          if (song.id !== editingSongId) return song
          return {
            ...song,
            idCategory,
            title,
            letter,
          }
        })
      } else {
        const baseSong = availableSongs.find((song) => song.id === editingSongId)
        if (!baseSong) {
          showFormFeedback(addSongFeedback, 'Não foi possível localizar a música para edição.', 'error')
          return
        }

        customSongs = [
          ...customSongs,
          {
            ...baseSong,
            idCategory,
            title,
            letter,
            sourceType: 'available-override',
          },
        ]
      }

      saveCustomRepertory(customSongs)
      selectedSongIds.add(editingSongId)
      resetSongFormState()
      showFormFeedback(addSongFeedback, 'Música adicionada atualizada com sucesso.')
      updateSelectedCount()
      renderList()
      renderSelectedList()
      return
    }

    const maxId = getCombinedSongs().reduce((currentMax, song) => Math.max(currentMax, Number(song.id) || 0), 0)
    const newSong = {
      id: maxId + 1,
      idCategory,
      title,
      letter,
      sourceType: 'user-added',
    }

    customSongs = [...customSongs, newSong]
    saveCustomRepertory(customSongs)
    selectedSongIds.add(newSong.id)

    resetSongFormState()
    showFormFeedback(addSongFeedback, 'Música adicionada em Músicas Adicionadas/Selecionadas.')
    updateSelectedCount()
    renderList()
    renderSelectedList()
  })

  logoutButton?.addEventListener('click', () => {
    clearSession()
    window.location.href = './signin.html'
  })

  generateButton?.addEventListener('click', async () => {
    showMessage(errorElement)

    if (!selectedSongIds.size) {
      showMessage(errorElement, 'Selecione pelo menos uma música antes de gerar o PowerPoint.')
      return
    }

    const selectedSongs = sortSongsByCategoryOrder(
      getCombinedSongs().filter((song) => selectedSongIds.has(song.id)),
      categoriesMap,
    )

    try {
      await generateRepertoryPptx(selectedSongs, categoriesMap)
    } catch {
      showMessage(errorElement, 'Não foi possível gerar o arquivo PowerPoint.')
    }
  })

  updateSelectedCount()
  renderList()
  renderSelectedList()
}

if (PAGE === 'home') initHomePage()
if (PAGE === 'signin') initSigninPage()
if (PAGE === 'dashboard') initDashboardPage()

applyTheme(getPreferredTheme())
setupThemeToggle()