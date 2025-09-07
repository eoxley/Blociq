/**
 * MIME type validation for compliance document uploads
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
] as const

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png'
] as const

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number]
export type AllowedExtension = typeof ALLOWED_EXTENSIONS[number]

/**
 * MIME type to extension mapping
 */
export const MIME_TO_EXTENSION: Record<AllowedMimeType, AllowedExtension[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
}

/**
 * Extension to MIME type mapping
 */
export const EXTENSION_TO_MIME: Record<AllowedExtension, AllowedMimeType> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
}

/**
 * Validate MIME type against allow-list
 */
export function isValidMimeType(mimeType: string): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)
}

/**
 * Validate file extension against allow-list
 */
export function isValidExtension(extension: string): extension is AllowedExtension {
  return ALLOWED_EXTENSIONS.includes(extension.toLowerCase() as AllowedExtension)
}

/**
 * Get MIME type from filename extension
 */
export function getMimeTypeFromFilename(filename: string): AllowedMimeType | null {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return EXTENSION_TO_MIME[extension as AllowedExtension] || null
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: AllowedMimeType): AllowedExtension {
  return MIME_TO_EXTENSION[mimeType][0]
}

/**
 * Validate file for compliance upload
 */
export function validateComplianceFile(file: File): {
  valid: boolean
  mimeType: AllowedMimeType | null
  error?: string
} {
  // Check MIME type first
  if (isValidMimeType(file.type)) {
    return {
      valid: true,
      mimeType: file.type as AllowedMimeType
    }
  }

  // Fallback to extension check
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  const mimeTypeFromExt = getMimeTypeFromFilename(file.name)
  
  if (mimeTypeFromExt) {
    return {
      valid: true,
      mimeType: mimeTypeFromExt
    }
  }

  return {
    valid: false,
    mimeType: null,
    error: "This file type isn't supported. Please upload a PDF, JPG or PNG."
  }
}

/**
 * Get friendly error message for invalid file type
 */
export function getFileTypeError(mimeType: string, filename: string): string {
  if (mimeType === 'application/octet-stream' || !mimeType) {
    return "We couldn't determine the file type. Please re-upload or contact support."
  }
  
  return "This file type isn't supported. Please upload a PDF, JPG or PNG."
}

/**
 * Get HTML accept attribute for file input
 */
export function getFileInputAccept(): string {
  return ALLOWED_MIME_TYPES.join(',')
}
