import 'server-only'

import { chunkMarkdown, type ChunkDraft } from '../chunk'
import type { FileKind } from '../files'
import { extractCsv } from './csv'
import { extractDocx } from './docx'
import { extractPdf } from './pdf'
import { extractPptx } from './pptx'
import { extractSql } from './sql'

function utf8(buffer: Uint8Array): string {
  return new TextDecoder('utf-8').decode(buffer).replace(/^﻿/, '')
}

/** Turn an uploaded file into chunk drafts according to its detected kind. */
export async function extractFile(kind: FileKind, buffer: Uint8Array): Promise<ChunkDraft[]> {
  switch (kind) {
    case 'text':
    case 'markdown':
      return chunkMarkdown(utf8(buffer))
    case 'csv':
      return extractCsv(utf8(buffer))
    case 'sql':
      return extractSql(utf8(buffer))
    case 'pdf':
      return extractPdf(buffer)
    case 'docx':
      return extractDocx(Buffer.from(buffer))
    case 'pptx':
      return extractPptx(buffer)
  }
}
