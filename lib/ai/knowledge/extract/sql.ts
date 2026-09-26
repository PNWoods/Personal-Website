import { chunkRawUnits, type ChunkDraft } from '../chunk'

/**
 * SQL scripts (DDL exports, data dictionaries): split into statements outside
 * quotes and comments, attach leading comments to the statement they precede,
 * and give every CREATE statement its own chunk labelled with the object name
 * so a question about CI_PER retrieves the whole table definition.
 */

interface Statement {
  text: string
  name: string | null
}

const CREATE_RE =
  /create\s+(?:or\s+replace\s+)?(?:global\s+temporary\s+|temporary\s+|temp\s+|unique\s+|materialized\s+|editionable\s+|noneditionable\s+)*(table|view|type|function|procedure|package(?:\s+body)?|index|trigger|sequence|synonym|schema)\s+(?:if\s+not\s+exists\s+)?("?[\w$#.]+"?(?:\."?[\w$#]+"?)?)/i

export function splitStatements(sql: string): Statement[] {
  const out: Statement[] = []
  let buf = ''
  let i = 0
  const n = sql.length
  let inSingle = false
  let inDouble = false
  let inLine = false
  let inBlock = false
  let dollarTag: string | null = null

  const push = () => {
    const text = buf.trim()
    buf = ''
    if (!text) return
    const m = CREATE_RE.exec(text)
    out.push({ text, name: m ? m[2].replace(/"/g, '') : null })
  }

  while (i < n) {
    const ch = sql[i]
    const next = sql[i + 1]
    if (inLine) {
      buf += ch
      if (ch === '\n') inLine = false
      i++
      continue
    }
    if (inBlock) {
      buf += ch
      if (ch === '*' && next === '/') {
        buf += next
        i += 2
        inBlock = false
        continue
      }
      i++
      continue
    }
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        buf += dollarTag
        i += dollarTag.length
        dollarTag = null
        continue
      }
      buf += ch
      i++
      continue
    }
    if (inSingle) {
      buf += ch
      if (ch === "'" && next === "'") {
        buf += next
        i += 2
        continue
      }
      if (ch === "'") inSingle = false
      i++
      continue
    }
    if (inDouble) {
      buf += ch
      if (ch === '"') inDouble = false
      i++
      continue
    }
    if (ch === '-' && next === '-') {
      inLine = true
      buf += ch
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlock = true
      buf += ch
      i++
      continue
    }
    if (ch === '$') {
      const m = /^\$[\w]*\$/.exec(sql.slice(i, i + 64))
      if (m) {
        dollarTag = m[0]
        buf += dollarTag
        i += dollarTag.length
        continue
      }
    }
    if (ch === "'") inSingle = true
    else if (ch === '"') inDouble = true
    if (ch === ';') {
      buf += ch
      push()
      i++
      continue
    }
    // Oracle-style "/" on its own line ends a PL/SQL block
    if (ch === '/' && (i === 0 || sql[i - 1] === '\n') && (next === '\n' || next === '\r' || next === undefined)) {
      push()
      i++
      continue
    }
    buf += ch
    i++
  }
  push()
  return out
}

export function extractSql(text: string): ChunkDraft[] {
  const statements = splitStatements(text.replace(/^﻿/, ''))
  const units: { section: string | null; content: string }[] = []
  let misc: string[] = []
  const flushMisc = () => {
    if (misc.length) units.push({ section: null, content: misc.join('\n\n') })
    misc = []
  }
  for (const s of statements) {
    if (s.name) {
      flushMisc()
      units.push({ section: s.name, content: s.text })
    } else {
      misc.push(s.text)
    }
  }
  flushMisc()
  return chunkRawUnits(units)
}
