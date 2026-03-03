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
    imagem_fundo: {
      x_cm: 0,
      y_cm: 0,
      largura_cm: 33.87,
      altura_cm: 19.05,
    },
    area_texto: {
      x_cm: 0,
      y_cm: 0.82,
      largura_cm: 33.87,
      altura_cm: 18.23,
      rotacao_graus: 0,
      escala_altura_percent: 102,
      escala_largura_percent: 100,
      alinhamento_vertical: 'middle',
      direcao_texto: 'horz',
      margens_texto_cm: {
        top: 0.13,
        right: 0.25,
        bottom: 0.13,
        left: 0.25,
      },
    },
    slide_capa: {
      habilitar: true,
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
      misturar_estrofes_no_mesmo_slide: false,
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
const cmToInches = (value) => Number(value || 0) / 2.54
const cmToPoints = (value) => (Number(value || 0) / 2.54) * 72

const clampNumber = (value, fallback, min, max) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

const normalizeLineBreaks = (text) => String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

const splitMusicIntoBlocks = (text) => {
  const normalized = normalizeLineBreaks(text)
  if (!normalized) return []

  return normalized
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean)
}

const estimateCharWidthFactor = ({ fontFamily, bold, italic }) => {
  const family = String(fontFamily ?? '').toLowerCase()
  let factor = family.includes('verdana') ? 0.58 : 0.55
  if (bold) factor += 0.03
  if (italic) factor += 0.01
  return factor
}

const estimateMaxCharsPerLine = ({ widthInches, fontSize, fontFamily, bold, italic }) => {
  const widthPoints = Math.max(1, Number(widthInches) * 72)
  const safeFontSize = clampNumber(fontSize, 28, 8, 96)
  const charWidth = safeFontSize * estimateCharWidthFactor({ fontFamily, bold, italic })
  return Math.max(8, Math.floor(widthPoints / Math.max(1, charWidth)))
}

const wrapTextToLines = (text, metrics) => {
  const rawText = String(text ?? '')
  if (!rawText.trim()) return []

  const maxChars = estimateMaxCharsPerLine(metrics)
  const lines = []

  rawText.split('\n').forEach((sourceLine) => {
    const line = sourceLine.trim()
    if (!line) {
      lines.push('')
      return
    }

    let current = ''
    line.split(/\s+/).forEach((word) => {
      const candidate = current ? `${current} ${word}` : word
      if (candidate.length <= maxChars) {
        current = candidate
        return
      }

      if (current) {
        lines.push(current)
      }

      if (word.length <= maxChars) {
        current = word
        return
      }

      let start = 0
      while (start < word.length) {
        const chunk = word.slice(start, start + maxChars)
        if (chunk.length === maxChars) {
          lines.push(chunk)
        } else {
          current = chunk
        }
        start += maxChars
      }

      if (word.length % maxChars === 0) {
        current = ''
      }
    })

    if (current) {
      lines.push(current)
    }
  })

  return lines
}

const resolveMaxLinesPerSlide = ({ heightInches, fontSize, lineSpacing }) => {
  const usableHeightPoints = Math.max(72, Number(heightInches) * 72)
  const safeFontSize = clampNumber(fontSize, 28, 8, 96)
  const safeLineSpacing = clampNumber(lineSpacing, 1.15, 1, 3)
  const lineHeightPoints = safeFontSize * safeLineSpacing * 1.2
  return Math.max(4, Math.floor(usableHeightPoints / Math.max(1, lineHeightPoints)))
}

const paginateLines = (lines, maxLinesPerSlide) => {
  const safeMax = Math.max(1, Number(maxLinesPerSlide) || 1)
  const pages = []
  let current = []

  lines.forEach((line) => {
    if (!line && current.length === 0) return

    if (current.length >= safeMax) {
      pages.push(current)
      current = []
    }

    current.push(line)
  })

  if (current.length) {
    pages.push(current)
  }

  return pages
}

const resolveBlockLines = ({ block, allowAutoWrap, contentBox, fontSize, fontFamily, bold, italic }) => {
  if (!allowAutoWrap) {
    return block.split('\n').map((line) => line.trimEnd())
  }

  return wrapTextToLines(block, {
    widthInches: contentBox.w,
    fontSize,
    fontFamily,
    bold,
    italic,
  })
}

const buildSongPages = ({
  lyric,
  contentBox,
  fontSize,
  lineSpacing,
  fontFamily,
  bold,
  italic,
  allowAutoWrap,
  mergeStanzas,
}) => {
  const blocks = splitMusicIntoBlocks(lyric)
  if (!blocks.length) return []

  const maxLines = resolveMaxLinesPerSlide({
    heightInches: contentBox.h,
    fontSize,
    lineSpacing,
  })

  const pages = []

  if (mergeStanzas) {
    const mergedLines = []

    blocks.forEach((block, blockIndex) => {
      const blockLines = resolveBlockLines({
        block,
        allowAutoWrap,
        contentBox,
        fontSize,
        fontFamily,
        bold,
        italic,
      })

      blockLines.forEach((line) => mergedLines.push(line))

      if (blockIndex < blocks.length - 1) {
        mergedLines.push('')
      }
    })

    return paginateLines(mergedLines, maxLines)
      .map((pageLines) => pageLines.join('\n').trim())
      .filter(Boolean)
  }

  blocks.forEach((block) => {
    const wrappedBlock = resolveBlockLines({
      block,
      allowAutoWrap,
      contentBox,
      fontSize,
      fontFamily,
      bold,
      italic,
    })

    const blockPages = paginateLines(wrappedBlock, maxLines)
      .map((pageLines) => pageLines.join('\n').trim())
      .filter(Boolean)

    blockPages.forEach((pageText) => pages.push(pageText))
  })

  return pages
}

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

const resolveTextAreaBox = (layout, margins, textAreaConfig) => {
  const fallback = resolveContentBox(layout, margins)

  if (!textAreaConfig || typeof textAreaConfig !== 'object') {
    return {
      ...fallback,
      rotate: 0,
      valign: 'middle',
      vert: 'horz',
      margin: [cmToPoints(0.13), cmToPoints(0.25), cmToPoints(0.13), cmToPoints(0.25)],
    }
  }

  const resolvedX = cmToInches(textAreaConfig.x_cm)
  const resolvedY = cmToInches(textAreaConfig.y_cm)
  const resolvedW = cmToInches(textAreaConfig.largura_cm)
  const resolvedH = cmToInches(textAreaConfig.altura_cm)
  const resolvedRotate = Number(textAreaConfig.rotacao_graus)
  const scaleHeight = Number(textAreaConfig.escala_altura_percent ?? 100)
  const scaleWidth = Number(textAreaConfig.escala_largura_percent ?? 100)

  const topMarginCm = Number(textAreaConfig?.margens_texto_cm?.top ?? 0.13)
  const rightMarginCm = Number(textAreaConfig?.margens_texto_cm?.right ?? 0.25)
  const bottomMarginCm = Number(textAreaConfig?.margens_texto_cm?.bottom ?? 0.13)
  const leftMarginCm = Number(textAreaConfig?.margens_texto_cm?.left ?? 0.25)

  const verticalAlign = String(textAreaConfig.alinhamento_vertical ?? 'middle').toLowerCase()
  const resolvedValign = ['top', 'middle', 'bottom'].includes(verticalAlign) ? verticalAlign : 'middle'

  const textDirection = String(textAreaConfig.direcao_texto ?? 'horz').toLowerCase()
  const resolvedVert = ['eaVert', 'horz', 'mongolianVert', 'vert', 'vert270', 'wordArtVert', 'wordArtVertRtl'].includes(textDirection)
    ? textDirection
    : 'horz'

  const widthWithScale = Number.isFinite(resolvedW) ? resolvedW * (Number.isFinite(scaleWidth) ? scaleWidth / 100 : 1) : fallback.w
  const heightWithScale = Number.isFinite(resolvedH)
    ? resolvedH * (Number.isFinite(scaleHeight) ? scaleHeight / 100 : 1)
    : fallback.h

  return {
    x: Number.isFinite(resolvedX) ? resolvedX : fallback.x,
    y: Number.isFinite(resolvedY) ? resolvedY : fallback.y,
    w: Number.isFinite(widthWithScale) && widthWithScale > 0 ? widthWithScale : fallback.w,
    h: Number.isFinite(heightWithScale) && heightWithScale > 0 ? heightWithScale : fallback.h,
    rotate: Number.isFinite(resolvedRotate) ? resolvedRotate : 0,
    valign: resolvedValign,
    vert: resolvedVert,
    margin: [cmToPoints(topMarginCm), cmToPoints(rightMarginCm), cmToPoints(bottomMarginCm), cmToPoints(leftMarginCm)],
  }
}

const resolveBackgroundImageBox = (layout, backgroundConfig) => {
  const fallback = {
    x: 0,
    y: 0,
    w: layout === 'LAYOUT_WIDE' ? 13.333 : 10,
    h: 7.5,
  }

  if (!backgroundConfig || typeof backgroundConfig !== 'object') {
    return fallback
  }

  const resolvedX = cmToInches(backgroundConfig.x_cm)
  const resolvedY = cmToInches(backgroundConfig.y_cm)
  const resolvedW = cmToInches(backgroundConfig.largura_cm)
  const resolvedH = cmToInches(backgroundConfig.altura_cm)

  return {
    x: Number.isFinite(resolvedX) ? resolvedX : fallback.x,
    y: Number.isFinite(resolvedY) ? resolvedY : fallback.y,
    w: Number.isFinite(resolvedW) && resolvedW > 0 ? resolvedW : fallback.w,
    h: Number.isFinite(resolvedH) && resolvedH > 0 ? resolvedH : fallback.h,
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
  const metadata = config.metadata ?? {}
  const layoutGlobal = config.layout_global ?? DEFAULT_CONFIG.layout_global
  const colors = layoutGlobal.cores ?? DEFAULT_CONFIG.layout_global.cores
  const fonts = layoutGlobal.fontes ?? DEFAULT_CONFIG.layout_global.fontes
  const layoutMargins = layoutGlobal.margens ?? DEFAULT_CONFIG.layout_global.margens
  const backgroundImageConfig = layoutGlobal.imagem_fundo ?? DEFAULT_CONFIG.layout_global.imagem_fundo
  const textAreaConfig = layoutGlobal.area_texto ?? DEFAULT_CONFIG.layout_global.area_texto
  const coverConfig = layoutGlobal.slide_capa ?? DEFAULT_CONFIG.layout_global.slide_capa
  const styles = config.estilos_slides ?? DEFAULT_CONFIG.estilos_slides
  const openingStyle = styles.abertura ?? DEFAULT_CONFIG.estilos_slides.abertura
  const contentStyle = styles.conteudo_leitura_canto ?? DEFAULT_CONFIG.estilos_slides.conteudo_leitura_canto
  const mergeStanzas = Boolean(contentStyle.misturar_estrofes_no_mesmo_slide)

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

  const titlePosition = resolveTitlePosition(openingStyle.posicao)
  const baseAlign = resolveAlign(settings.textAlign ?? fonts.alinhamento)
  const contentBox = resolveTextAreaBox(pptx.layout, appliedMargins, textAreaConfig)
  const backgroundImageBox = resolveBackgroundImageBox(pptx.layout, backgroundImageConfig)

  const applySlideBackground = (slide) => {
    slide.background = { color: appliedBackgroundColor }
    if (backgroundImageData || backgroundImagePath) {
      slide.addImage({
        ...(backgroundImageData ? { data: backgroundImageData } : { path: backgroundImagePath }),
        ...backgroundImageBox,
      })
    }
  }

  if (Boolean(coverConfig?.habilitar)) {
    const coverSlide = pptx.addSlide()
    applySlideBackground(coverSlide)

    const coverTitle = String(metadata?.contexto ?? '').trim()
    if (coverTitle) {
      coverSlide.addText(normalizeText(coverTitle, textCase), {
        ...titlePosition,
        bold: Boolean(openingStyle.negrito || appliedBold),
        italic: appliedItalic,
        underline: appliedUnderline,
        color: appliedHighlightColor,
        fontFace: appliedFontFamily,
        fontSize: appliedTitleSize,
        align: titlePosition.align,
      })
    }
  }

  songs.forEach((song, songIndex) => {
    const pages = buildSongPages({
      lyric: normalizeText(song.letter, textCase),
      contentBox,
      fontSize: appliedContentSize,
      lineSpacing: appliedLineSpacing,
      fontFamily: appliedFontFamily,
      bold: appliedBold,
      italic: appliedItalic,
      allowAutoWrap: Boolean(contentStyle.quebra_automatica),
      mergeStanzas,
    })

    const fallbackPages = pages.length ? pages : [normalizeText(song.letter, textCase)]

    fallbackPages.forEach((pageText, pageIndex) => {
      const slide = pptx.addSlide()
      applySlideBackground(slide)

      const continuationLabel = pageIndex > 0 ? ' (cont.)' : ''
      slide.addText(normalizeText(`${song.title}${continuationLabel}`, textCase), {
        ...titlePosition,
        bold: Boolean(openingStyle.negrito || appliedBold),
        italic: appliedItalic,
        underline: appliedUnderline,
        color: appliedHighlightColor,
        fontFace: appliedFontFamily,
        fontSize: appliedTitleSize,
        align: titlePosition.align,
      })

      slide.addText(pageText, {
        ...contentBox,
        fontFace: appliedFontFamily,
        fontSize: appliedContentSize,
        color: appliedMainColor,
        bold: appliedBold,
        italic: appliedItalic,
        underline: appliedUnderline,
        valign: contentBox.valign,
        align: baseAlign,
        vert: contentBox.vert,
        rotate: contentBox.rotate,
        breakLine: Boolean(contentStyle.quebra_automatica),
        lineSpacingMultiple: appliedLineSpacing,
        margin: contentBox.margin,
      })
    })

    if (songIndex < songs.length - 1) {
      const separatorSlide = pptx.addSlide()
      applySlideBackground(separatorSlide)
    }
  })

  await pptx.writeFile({ fileName: buildFileName() })
}