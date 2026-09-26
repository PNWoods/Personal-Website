import { estimateTokens } from '../../tokens'
import { CHUNK_TOKENS, chunkRawUnits, type ChunkDraft } from '../chunk'

/**
 * CSV/TSV: a small RFC 4180 parser (quotes, embedded newlines, delimiter
 * sniffing). Rows are packed to ~CHUNK_TOKENS with the header repeated at the
 * top of every chunk so each chunk is self-describing.
 */

function sniffDelimiter(sample: string): string {
  const firstLine = sample.split(/\r?\n/, 1)[0] ?? ''
  const candidates = [',', '\t', ';', '|']
  let best = ','
  let bestCount = -1
  for (const d of candidates) {
    const count = firstLine.split(d).length - 1
    if (count > bestCount) {
      best = d
      bestCount = count
    }
  }
  return best
}

export function parseCsv(text: string, delimiter = sniffDelimiter(text)): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      quoted = true
    } else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  row.push(field)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

function joinRow(cells: string[], delimiter: string): string {
  return cells
    .map((c) => (c.includes(delimiter) || c.includes('"') || c.includes('\n') ? `"${c.replace(/"/g, '""')}"` : c))
    .join(delimiter)
}

export function extractCsv(text: string): ChunkDraft[] {
  const clean = text.replace(/^﻿/, '')
  const delimiter = sniffDelimiter(clean)
  const rows = parseCsv(clean, delimiter)
  if (rows.length === 0) return []
  const header = joinRow(rows[0], delimiter)
  const headerTokens = estimateTokens(header) + 1
  const units: { section: string; content: string }[] = []

  let start = 2 // 1-based data row numbers for the section label
  let buf: string[] = []
  let tokens = headerTokens
  const flush = (endRow: number) => {
    if (!buf.length) return
    units.push({
      section: start === endRow ? `Row ${start}` : `Rows ${start}–${endRow}`,
      content: `${header}\n${buf.join('\n')}`,
    })
    buf = []
    tokens = headerTokens
  }
  for (let i = 1; i < rows.length; i++) {
    const line = joinRow(rows[i], delimiter)
    const t = estimateTokens(line) + 1
    if (tokens + t > CHUNK_TOKENS && buf.length) {
      flush(i) // rows are 1-based; row i (0-based) is line i+1, previous ended at i
      start = i + 1
    }
    buf.push(line)
    tokens += t
  }
  flush(rows.length)
  return chunkRawUnits(units)
}
