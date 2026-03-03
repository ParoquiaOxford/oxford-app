import PptxGenJS from 'pptxgenjs'

const buildFileName = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `repertorio-${year}-${month}-${day}.pptx`
}

export const generateRepertoryPptx = async (songs, categoriesMap) => {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Aparecida Oxford'
  pptx.subject = 'Repertório de Missas'
  pptx.title = 'Repertório de Missas'

  songs.forEach((song) => {
    const slide = pptx.addSlide()
    const categoryName = categoriesMap.get(song.idCategory)?.name ?? 'Sem categoria'

    slide.addText(`${categoryName} · ${song.title}`, {
      x: 0.5,
      y: 0.4,
      w: 12.3,
      h: 0.6,
      bold: true,
      color: '7C2D12',
      fontFace: 'Calibri',
      fontSize: 20,
    })

    slide.addText(song.letter, {
      x: 0.6,
      y: 1.2,
      w: 12.1,
      h: 5.5,
      fontFace: 'Calibri',
      fontSize: 18,
      color: '1C1917',
      valign: 'top',
      breakLine: true,
      margin: 4,
    })
  })

  await pptx.writeFile({ fileName: buildFileName() })
}