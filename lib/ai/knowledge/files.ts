/**
 * Client-safe helpers shared by the upload UI and the ingestion pipeline:
 * which files are accepted, how big they may be, and where they are stored.
 */

export type FileKind = 'text' | 'markdown' | 'csv' | 'sql' | 'pdf' | 'docx' | 'pptx'

/** Matches the bucket's file_size_limit in migration 0006. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

const BY_EXTENSION: Record<string, FileKind> = {
  txt: 'text',
  text: 'text',
  log: 'text',
  md: 'markdown',
  markdown: 'markdown',
  csv: 'csv',
  tsv: 'csv',
  sql: 'sql',
  ddl: 'sql',
  pdf: 'pdf',
  docx: 'docx',
  pptx: 'pptx',
}

const BY_MIME: Record<string, FileKind> = {
  'text/plain': 'text',
  'text/markdown': 'markdown',
  'text/csv': 'csv',
  'text/tab-separated-values': 'csv',
  'application/sql': 'sql',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
}

/** Value for <input type="file" accept>. */
export const ACCEPT = Object.keys(BY_EXTENSION)
  .map((e) => `.${e}`)
  .join(',')

export function detectKind(name: string, mime?: string | null): FileKind | null {
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (BY_EXTENSION[ext]) return BY_EXTENSION[ext]
  if (mime && BY_MIME[mime]) return BY_MIME[mime]
  return null
}

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file'
  const clean = base.replace(/[^\w.\-()+ ]+/g, '_').replace(/\s+/g, ' ').trim()
  return clean.slice(0, 120) || 'file'
}

export function storagePath(userId: string, documentId: string, filename: string): string {
  return `${userId}/${documentId}/${sanitizeFilename(filename)}`
}

export function formatBytes(n: number | null | undefined): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
