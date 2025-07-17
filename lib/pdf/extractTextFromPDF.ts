import PDFParser from 'pdf2json'
import vision from '@google-cloud/vision'
import { tmpdir } from 'os'
import { writeFile, unlink } from 'fs/promises'
import path from 'path'

const client = new vision.ImageAnnotatorClient()

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const parser = new PDFParser()

    parser.on('pdfParser_dataError', err => reject(err.parserError))

    parser.on('pdfParser_dataReady', async pdfData => {
      const pages = pdfData?.formImage?.Pages || []

      const allText = pages
        .flatMap((page: any) =>
          page.Texts.map((t: any) => decodeURIComponent(t.R[0].T))
        )
        .join(' ')

      if (allText.length > 100) {
        return resolve(allText)
      }

      // Fallback: Google Cloud OCR
      try {
        const tempFilePath = path.join(tmpdir(), `ocr-${Date.now()}.pdf`)
        await writeFile(tempFilePath, buffer)

        const [result] = await client.documentTextDetection(tempFilePath)

        const ocrText = result?.fullTextAnnotation?.text || ''
        await unlink(tempFilePath)

        if (ocrText.length > 50) {
          console.log('✅ OCR fallback succeeded.')
          return resolve(ocrText)
        }

        return resolve('')
      } catch (ocrError) {
        console.error('🛑 OCR fallback failed:', ocrError)
        return resolve('')
      }
    })

    parser.parseBuffer(buffer)
  })
} 