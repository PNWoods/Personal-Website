import 'server-only'

import { chunkMarkdown, type ChunkDraft } from '../chunk'
import type { FileKind } from '../files'
import { extractCsv } from './csv'
import { extractDocx } from './docx'
import { describeImage } from './image'
import { extractPdf } from './pdf'
import { extractPptx } from './pptx'
import { extractSql } from './sql'

export interface Extracted {
  chunks: ChunkDraft[]
  /**
   * Text worth persisting on the document so a re-index does not repeat
   * expensive work (image transcription) or a network fetch (web pages).
   */
  content?: string
}

function utf8(buffer: Uint8Array): string {
  return new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, '')
}

/** Turn an uploaded file into chunk drafts according to its detected kind. */
export async function extractFile(
  kind: FileKind,
  buffer: Uint8Array,
  opts: { signal?: AbortSignal } = {}
): Promise<Extracted> {
  switch (kind) {
    case 'text':
    case 'markdown':
      return { chunks: chunkMarkdown(utf8(buffer)) }
    case 'csv':
      return { chunks: extractCsv(utf8(buffer)) }
    case 'sql':
      return { chunks: extractSql(utf8(buffer)) }
    case 'pdf':
      return { chunks: await extractPdf(buffer) }
    case 'docx':
      return { chunks: await extractDocx(Buffer.from(buffer)) }
    case 'pptx':
      return { chunks: extractPptx(buffer) }
    case 'image': {
      const content = await describeImage(buffer, opts)
      return { chunks: chunkMarkdown(content), content }
    }
  }
}
