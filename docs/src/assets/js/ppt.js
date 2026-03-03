import PptxGenJS from 'pptxgenjs'
const PPT_SETTINGS_KEY = 'oxford.pptSettings'

const DEFAULT_CONFIG = {
  layout_global: {
    proporcao_tela: '16:9',
    cores: {
      fundo: '#FFFFFF',
      texto_principal: '#000000',
      destaque_secao: '#5B9BD5',
      texto_suporte: '#757575',
    },
    fontes: {
      familias_permitidas: ['Arial', 'Verdana'],
      familia_principal: 'Arial',
      transformacao_texto: 'maiusculas',
      alinhamento: 'esquerda',
      estilo: {
        negrito: false,
        italico: false,
        sublinhado: false,
      },
    },
    margens: {
      top: 4,
      bottom: 4,
      left: 4,
      right: 4,
    },
  },
  estilos_slides: {
    abertura: {
      tamanho_fonte: 32,
      negrito: true,
      posicao: 'centro',
    },
    secao_liturgica: {
      tamanho_fonte: 18,
      cor: '#757575',
      alinhamento: 'inferior-direita',
      italico: false,
    },
    conteudo_leitura_canto: {
      tamanho_fonte: 28,
      espacamento_linhas: 1.15,
      quebra_automatica: true,
      letras_maiusculas: true,
    },
  },
}

const stripHex = (value, fallback) => {
  const color = String(value ?? fallback ?? '').replace('#', '').trim()
  return color || String(fallback).replace('#', '')
}

const resolveAlign = (value) => {
  const map = {
    esquerda: 'left',
    centro: 'center',
    direita: 'right',
  }
  return map[String(value ?? '').toLowerCase()] ?? 'left'
}

const resolveLayout = (ratio) => {
  return String(ratio).includes('16:9') ? 'LAYOUT_WIDE' : 'LAYOUT_STANDARD'
}

const resolveTitlePosition = (position) => {
  const value = String(position ?? '').toLowerCase()
  if (value === 'centro') {
    return { x: 0.6, y: 0.5, w: 12.1, h: 0.9, align: 'center' }
  }
  return { x: 0.5, y: 0.4, w: 12.3, h: 0.8, align: 'left' }
}

const resolveSectionPosition = (position) => {
  const value = String(position ?? '').toLowerCase()
  if (value === 'inferior-direita') {
    return { x: 8.6, y: 6.6, w: 4.3, h: 0.4, align: 'right' }
  }
  return { x: 0.5, y: 6.6, w: 12.3, h: 0.4, align: 'left' }
}

const normalizeText = (text, textCase) => {
  const raw = String(text ?? '')
  if (textCase === 'maiusculas') return raw.toUpperCase()
  if (textCase === 'minusculas') return raw.toLowerCase()
  return raw
}

const resolveTextCase = (settings, fonts, contentStyle) => {
  if (typeof settings?.textCase === 'string' && settings.textCase.length) {
    const normalized = settings.textCase.toLowerCase()
    if (['maiusculas', 'minusculas', 'original'].includes(normalized)) return normalized
  }

  if (typeof fonts?.transformacao_texto === 'string' && fonts.transformacao_texto.length) {
    const normalized = fonts.transformacao_texto.toLowerCase()
    if (['maiusculas', 'minusculas', 'original'].includes(normalized)) return normalized
  }

  if (String(fonts?.caixa_texto ?? '').toUpperCase() === 'UPPERCASE' || Boolean(contentStyle?.letras_maiusculas)) {
    return 'maiusculas'
  }

  return 'original'
}

const resolveMargins = (settingsMargins, configMargins) => {
  return {
    top: Number(settingsMargins?.top ?? configMargins?.top ?? 4),
    bottom: Number(settingsMargins?.bottom ?? configMargins?.bottom ?? 4),
    left: Number(settingsMargins?.left ?? configMargins?.left ?? 4),
    right: Number(settingsMargins?.right ?? configMargins?.right ?? 4),
  }
}

const pointsToInches = (value) => Number(value || 0) / 72

const resolveContentBox = (layout, margins) => {
  const slideWidth = layout === 'LAYOUT_WIDE' ? 13.333 : 10
  const base = {
    x: 0.6,
    y: 1.5,
    w: slideWidth - 1.2,
    h: 5,
  }

  const left = pointsToInches(margins.left)
  const right = pointsToInches(margins.right)
  const top = pointsToInches(margins.top)
  const bottom = pointsToInches(margins.bottom)

  return {
    x: base.x + left,
    y: base.y + top,
    w: Math.max(1.5, base.w - left - right),
    h: Math.max(1, base.h - top - bottom),
  }
}

const loadPowerPointSettings = () => {
  const raw = localStorage.getItem(PPT_SETTINGS_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const loadPowerPointConfig = async () => {
  const candidates = ['./data/ConfigPowePoint.json']

  for (const filePath of candidates) {
    try {
      const response = await fetch(filePath)
      if (!response.ok) continue
      const parsed = await response.json()
      return parsed?.ConfigPowerPoint ?? DEFAULT_CONFIG
    } catch {
      continue
    }
  }

  return DEFAULT_CONFIG
}

const buildFileName = () => {
  const now = new Date()
  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const dayOfWeek = weekDays[now.getDay()] ?? 'DOM'

  return `${day}${month}_${dayOfWeek}_${year}${month}${day}_${hours}${minutes}${seconds}.pptx`
}

export const generateRepertoryPptx = async (songs, categoriesMap) => {
  const config = await loadPowerPointConfig()
  const settings = loadPowerPointSettings() ?? {}
  const layoutGlobal = config.layout_global ?? DEFAULT_CONFIG.layout_global
  const colors = layoutGlobal.cores ?? DEFAULT_CONFIG.layout_global.cores
  const fonts = layoutGlobal.fontes ?? DEFAULT_CONFIG.layout_global.fontes
  const layoutMargins = layoutGlobal.margens ?? DEFAULT_CONFIG.layout_global.margens
  const styles = config.estilos_slides ?? DEFAULT_CONFIG.estilos_slides
  const openingStyle = styles.abertura ?? DEFAULT_CONFIG.estilos_slides.abertura
  const sectionStyle = styles.secao_liturgica ?? DEFAULT_CONFIG.estilos_slides.secao_liturgica
  const contentStyle = styles.conteudo_leitura_canto ?? DEFAULT_CONFIG.estilos_slides.conteudo_leitura_canto

  const allowedFonts = Array.isArray(fonts.familias_permitidas)
    ? fonts.familias_permitidas.map((font) => String(font))
    : ['Arial', 'Verdana']

  const defaultFont =
    allowedFonts.find((font) => font.toLowerCase() === String(fonts.familia_principal ?? '').toLowerCase()) ??
    allowedFonts[0] ??
    'Arial'

  const requestedFont = String(settings.fontFamily ?? '').trim()
  const appliedFontFamily =
    allowedFonts.find((font) => font.toLowerCase() === requestedFont.toLowerCase()) ?? defaultFont

  const textCase = resolveTextCase(settings, fonts, contentStyle)

  const baseFontStyle = fonts.estilo ?? {}
  const appliedBold = Boolean(settings?.fontStyle?.bold ?? baseFontStyle.negrito ?? false)
  const appliedItalic = Boolean(settings?.fontStyle?.italic ?? baseFontStyle.italico ?? false)
  const appliedUnderline = Boolean(settings?.fontStyle?.underline ?? baseFontStyle.sublinhado ?? false)

  const appliedTitleSize = Number(settings.fontSizeTitle ?? openingStyle.tamanho_fonte ?? 32)
  const appliedContentSize = Number(settings.fontSizeContent ?? contentStyle.tamanho_fonte ?? 28)
  const appliedMainColor = stripHex(settings.colorMain ?? colors.texto_principal, '#000000')
  const appliedHighlightColor = stripHex(settings.colorHighlight ?? colors.destaque_secao, '#5B9BD5')
  const appliedSupportColor = stripHex(settings.colorSupport ?? sectionStyle.cor ?? colors.texto_suporte, '#757575')
  const appliedBackgroundColor = stripHex(settings.colorBackground ?? colors.fundo, '#FFFFFF')
  const appliedLineSpacing = Number(settings.lineSpacing ?? contentStyle.espacamento_linhas ?? 1.15)
  const appliedMargins = resolveMargins(settings.margins, layoutMargins)

  const backgroundImageData = String(settings.backgroundImageDataUrl ?? '').trim()
  const backgroundImagePath = String(settings.backgroundImagePath ?? '').trim()

  const pptx = new PptxGenJS()
  pptx.layout = resolveLayout(layoutGlobal.proporcao_tela)
  pptx.author = 'Aparecida Oxford'
  pptx.subject = 'Repertório de Missas'
  pptx.title = 'Repertório de Missas'

  songs.forEach((song) => {
    const slide = pptx.addSlide()
    const categoryName = categoriesMap.get(song.idCategory)?.name ?? 'Sem categoria'
    slide.background = { color: appliedBackgroundColor }

    if (backgroundImageData || backgroundImagePath) {
      slide.addImage({
        ...(backgroundImageData ? { data: backgroundImageData } : { path: backgroundImagePath }),
        x: 0,
        y: 0,
        w: pptx.layout === 'LAYOUT_WIDE' ? 13.333 : 10,
        h: 7.5,
      })
    }

    const titlePosition = resolveTitlePosition(openingStyle.posicao)
    const sectionPosition = resolveSectionPosition(sectionStyle.alinhamento)
    const baseAlign = resolveAlign(settings.textAlign ?? fonts.alinhamento)
    const contentBox = resolveContentBox(pptx.layout, appliedMargins)

    slide.addText(normalizeText(song.title, textCase), {
      ...titlePosition,
      bold: Boolean(openingStyle.negrito || appliedBold),
      italic: appliedItalic,
      underline: appliedUnderline,
      color: appliedHighlightColor,
      fontFace: appliedFontFamily,
      fontSize: appliedTitleSize,
      align: titlePosition.align,
    })

    slide.addText(normalizeText(categoryName, textCase), {
      ...sectionPosition,
      fontFace: appliedFontFamily,
      fontSize: Number(sectionStyle.tamanho_fonte ?? 18),
      color: appliedSupportColor,
      bold: appliedBold,
      italic: Boolean(sectionStyle.italico || appliedItalic),
      underline: appliedUnderline,
      align: sectionPosition.align,
    })

    slide.addText(normalizeText(song.letter, textCase), {
      ...contentBox,
      fontFace: appliedFontFamily,
      fontSize: appliedContentSize,
      color: appliedMainColor,
      bold: appliedBold,
      italic: appliedItalic,
      underline: appliedUnderline,
      valign: 'top',
      align: baseAlign,
      breakLine: Boolean(contentStyle.quebra_automatica),
      lineSpacingMultiple: appliedLineSpacing,
      margin: 0,
    })
  })

  await pptx.writeFile({ fileName: buildFileName() })
}