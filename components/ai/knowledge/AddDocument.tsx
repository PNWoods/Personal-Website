'use client'

import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { ACCEPT, MAX_FILE_BYTES, detectKind, formatBytes } from '@/lib/ai/knowledge/files'

type Tab = 'upload' | 'note'

export default function AddDocument({
  onFiles,
  onNote,
  busy,
}: {
  onFiles: (files: File[]) => Promise<void>
  onNote: (title: string, content: string) => Promise<void>
  busy: boolean
}) {
  const [tab, setTab] = useState<Tab>('upload')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(list: FileList | File[]) {
    setError(null)
    const files = Array.from(list)
    const rejected: string[] = []
    const ok = files.filter((f) => {
      if (!detectKind(f.name, f.type)) {
        rejected.push(`${f.name}: unsupported type`)
        return false
      }
      if (f.size > MAX_FILE_BYTES) {
        rejected.push(`${f.name}: larger than ${formatBytes(MAX_FILE_BYTES)}`)
        return false
      }
      return true
    })
    if (rejected.length) setError(rejected.join(' · '))
    if (ok.length) await onFiles(ok)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim() || busy) return
    await onNote(title.trim(), content)
    setTitle('')
    setContent('')
  }

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-sm rounded-md ${tab === t ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-3 flex gap-1">
        <button type="button" className={tabClass('upload')} onClick={() => setTab('upload')}>
          Upload files
        </button>
        <button type="button" className={tabClass('note')} onClick={() => setTab('note')}>
          Write note
        </button>
      </div>

      {tab === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(e.dataTransfer.files)
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center ${
            dragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/20'
          }`}
        >
          <Upload size={20} className="text-white/50" />
          <p className="text-sm text-white/70">Drop files here, or</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
          >
            Choose files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => e.target.files && void handleFiles(e.target.files)}
          />
          <p className="text-xs text-white/40">
            txt, md, csv, sql, pdf, docx, pptx · up to {formatBytes(MAX_FILE_BYTES)} each
          </p>
        </div>
      ) : (
        <form onSubmit={submitNote} className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. CI_PER person table)"
            className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm outline-none placeholder-white/40 focus:border-blue-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'Markdown works. Use headings (## Columns) so each section becomes its own searchable chunk.'}
            rows={8}
            className="w-full resize-y rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-sm leading-relaxed outline-none placeholder-white/40 focus:border-blue-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || busy}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              Save and index
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
    </div>
  )
}
