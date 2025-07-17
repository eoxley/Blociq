declare module 'pdf2json' {
  interface PDFParser {
    on(event: 'pdfParser_dataError', callback: (err: any) => void): void
    on(event: 'pdfParser_dataReady', callback: (pdfData: any) => void): void
    parseBuffer(buffer: Buffer): void
  }

  interface PDFData {
    formImage?: {
      Pages?: any[]
    }
  }

  class PDFParser {
    constructor()
    on(event: 'pdfParser_dataError', callback: (err: any) => void): void
    on(event: 'pdfParser_dataReady', callback: (pdfData: PDFData) => void): void
    parseBuffer(buffer: Buffer): void
  }

  export = PDFParser
} 