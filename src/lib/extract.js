// Extract plain text from an uploaded document, in the browser.
// Supports PDF (pdfjs-dist), Word .docx (mammoth), and plain text.

const MAX_CHARS = 18000 // keep token use reasonable

export async function extractFileText(file) {
  const name = (file.name || '').toLowerCase()
  const type = file.type || ''
  let text = ''

  if (name.endsWith('.pdf') || type === 'application/pdf') {
    text = await extractPdf(file)
  } else if (name.endsWith('.docx') || type.includes('officedocument.wordprocessingml')) {
    text = await extractDocx(file)
  } else if (name.endsWith('.txt') || type.startsWith('text/')) {
    text = await file.text()
  } else if (name.endsWith('.doc')) {
    throw new Error('Old .doc files aren’t supported — please save it as .docx or a PDF and try again.')
  } else {
    throw new Error('Unsupported file — please upload a PDF or Word (.docx) document.')
  }

  text = (text || '').replace(/\s+\n/g, '\n').trim()
  if (!text) throw new Error('I couldn’t read any text from that file (it may be a scanned image).')
  return text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + '\n…(truncated)' : text
}

async function extractPdf(file) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise
  let out = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    out += content.items.map((i) => ('str' in i ? i.str : '')).join(' ') + '\n'
    if (out.length > MAX_CHARS) break
  }
  return out
}

async function extractDocx(file) {
  const mammoth = await import('mammoth/mammoth.browser.js')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value || ''
}
