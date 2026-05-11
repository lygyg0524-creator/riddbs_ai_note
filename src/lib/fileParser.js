import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href

function textToTiptap(text) {
  const lines = text.split('\n')
  const content = lines.map(line => ({
    type: 'paragraph',
    content: line.trim() ? [{ type: 'text', text: line }] : [],
  }))
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  }
}

async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const parts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    parts.push(textContent.items.map(item => item.str).join(' '))
  }
  return parts.join('\n')
}

async function parseDoc(file) {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

async function parseHwpx(file) {
  const zip = await JSZip.loadAsync(file)
  const sectionFiles = Object.keys(zip.files)
    .filter(name => /^Contents\/section\d+\.xml$/i.test(name))
    .sort()

  if (!sectionFiles.length) throw new Error('HWPX 본문을 찾을 수 없습니다')

  const parts = []
  for (const fileName of sectionFiles) {
    const xml = await zip.files[fileName].async('string')
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    doc.querySelectorAll('para').forEach(para => {
      const texts = []
      para.querySelectorAll('t').forEach(t => { if (t.textContent) texts.push(t.textContent) })
      parts.push(texts.join(''))
    })
  }
  return parts.join('\n')
}

async function parseHwp(file) {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  // ZIP 헤더(PK)면 HWPX로 처리
  if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
    return parseHwpx(file)
  }

  // 바이너리에서 UTF-16LE 한글/영문 문자열 추출
  const view = new DataView(arrayBuffer)
  const segments = []
  let current = ''
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = view.getUint16(i, true)
    if ((code >= 0x20 && code <= 0x7E) || (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x3131 && code <= 0x318E)) {
      current += String.fromCharCode(code)
    } else {
      if (current.length >= 4) segments.push(current)
      current = ''
    }
  }
  if (current.length >= 4) segments.push(current)

  const result = segments.join('\n')
  if (!result.trim()) throw new Error('HWP 파일을 읽을 수 없습니다. HWPX 형식으로 저장 후 다시 시도해주세요.')
  return result
}

export async function parseFile(file) {
  const name = file.name.toLowerCase()
  const title = file.name.replace(/\.[^.]+$/, '')

  let text = ''
  if (name.endsWith('.pdf')) text = await parsePDF(file)
  else if (name.endsWith('.doc')) text = await parseDoc(file)
  else if (name.endsWith('.hwpx')) text = await parseHwpx(file)
  else if (name.endsWith('.hwp')) text = await parseHwp(file)
  else throw new Error('지원하지 않는 파일 형식입니다 (.hwp, .hwpx, .doc, .pdf만 가능)')

  return { title, content: textToTiptap(text.trim()) }
}
