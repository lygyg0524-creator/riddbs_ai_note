import { useState, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'
import { getAllNotes, importNotes, deleteNote } from '../db/db'

function extractTextFromJSON(node, maxChars = 50) {
  if (!node) return ''
  if (node.type === 'text') return node.text ?? ''
  const children = node.content ?? []
  let result = ''
  for (const child of children) {
    result += extractTextFromJSON(child, maxChars)
    if (result.length >= maxChars) break
  }
  return result.slice(0, maxChars)
}

function getPreview(note) {
  if (note.summary) return note.summary.split('\n')[0]
  return extractTextFromJSON(note.content)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function NoteIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function NoteCard({ note, isSelected, onClick, onDelete }) {
  function handleDelete(e) {
    e.stopPropagation()
    if (window.confirm(`"${note.title || '제목 없음'}" 노트를 삭제할까요?`)) {
      onDelete(note.id)
    }
  }

  const preview = getPreview(note)

  return (
    <div
      onClick={() => onClick(note)}
      className={`group relative w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-[#f1f0ee] border border-[#e8e8e6]'
          : 'border border-transparent hover:bg-[#f7f6f3] hover:border-[#e8e8e6]'
      }`}
    >
      <div className="flex items-start gap-2.5 pr-6">
        <span className={`mt-0.5 shrink-0 ${isSelected ? 'text-[#37352f]' : 'text-[#9b9a97]'}`}>
          <NoteIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-xs font-medium leading-snug ${isSelected ? 'text-[#37352f]' : 'text-[#6b6a67] group-hover:text-[#37352f]'} transition-colors duration-150`}>
            {note.title || '제목 없음'}
          </p>
          {preview && (
            <p className="truncate text-xs text-[#9b9a97] mt-0.5 leading-snug">
              {preview}
            </p>
          )}
          <p className="text-[10px] text-[#9b9a97] mt-1">
            {formatDate(note.updatedAt || note.createdAt)}
          </p>
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-[#9b9a97] hover:text-red-500 transition-all duration-150 p-1 rounded-md hover:bg-red-50"
        title="삭제"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  )
}

function NoteList({ notes = [], selectedNote, onSelect, onDelete, onNewNote, userEmail, onLogout }) {
  const [query, setQuery] = useState('')
  const importRef = useRef(null)

  async function handleExport() {
    const data = await getAllNotes()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'notes-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const MAX_SIZE = 5 * 1024 * 1024
      if (file.size > MAX_SIZE) throw new Error(`파일 크기가 너무 큽니다 (최대 5MB)`)
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext !== 'json') throw new Error('JSON 파일(.json)만 가져올 수 있습니다')
      const ALLOWED_MIME = ['application/json', 'text/plain', 'text/json', '']
      if (!ALLOWED_MIME.includes(file.type)) throw new Error('지원하지 않는 파일 형식입니다')
      const text = await file.text()
      if (!text.trim().startsWith('[')) throw new Error('배열 형식의 JSON 파일이 아닙니다')
      let data
      try { data = JSON.parse(text) } catch { throw new Error('JSON 파싱 실패') }
      if (!Array.isArray(data)) throw new Error('배열 형식이 아닙니다')
      if (data.length > 500) throw new Error(`한 번에 최대 500개까지 가져올 수 있습니다`)
      const ALLOWED = ['id', 'title', 'content', 'summary', 'summaryLength', 'keywords', 'versions', 'createdAt', 'updatedAt']
      const cleaned = data.map((note, i) => {
        if (typeof note !== 'object' || note === null) throw new Error(`${i + 1}번째 항목이 올바르지 않습니다`)
        if (typeof note.content !== 'object' || note.content === null) throw new Error(`${i + 1}번째 노트에 content가 없거나 올바르지 않습니다`)
        if (note.title !== undefined && typeof note.title !== 'string') throw new Error(`${i + 1}번째 노트의 title이 올바르지 않습니다`)
        if (note.title?.length > 200) throw new Error(`${i + 1}번째 노트의 제목이 너무 깁니다`)
        const obj = Object.fromEntries(ALLOWED.filter(k => note[k] !== undefined).map(k => [k, note[k]]))
        if (obj.versions) obj.versions = obj.versions.slice(0, 10)
        return obj
      })
      await importNotes(cleaned)
    } catch (err) {
      alert('가져오기 실패: ' + err.message)
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  const fuse = useMemo(() => new Fuse(notes, { keys: ['title', 'summary', 'keywords'], threshold: 0.4, ignoreLocation: true }), [notes])
  const filtered = useMemo(() => (query.trim() ? fuse.search(query).map((r) => r.item) : notes), [fuse, query, notes])

  return (
    <div className="h-full flex flex-col bg-[#f7f6f3] border-r border-[#e8e8e6]">
      {/* 헤더 */}
      <div className="px-3 pt-4 pb-3 border-b border-[#e8e8e6]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold text-[#9b9a97] uppercase tracking-widest">노트</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-[10px] text-[#9b9a97] hover:text-[#37352f] transition-colors duration-150"
            title="로그아웃"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            로그아웃
          </button>
        </div>

        {/* 검색 */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9b9a97]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색..."
            className="w-full bg-white border border-[#e8e8e6] text-[#37352f] text-xs pl-7 pr-3 py-2 rounded-lg placeholder-[#b4b4af] outline-none focus:border-[#a0a0ff] focus:ring-1 focus:ring-[#6366f1]/10 transition-all duration-150"
          />
        </div>

        {userEmail && (
          <p className="text-[10px] text-[#9b9a97] truncate mt-2.5 px-0.5">{userEmail}</p>
        )}
      </div>

      {/* 새 노트 */}
      <div className="px-3 py-2.5 border-b border-[#e8e8e6]">
        <button
          onClick={onNewNote}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[#6b6a67] hover:bg-white hover:text-[#37352f] text-xs transition-all duration-150 border border-transparent hover:border-[#e8e8e6]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>새 페이지</span>
        </button>
      </div>

      {/* 노트 목록 */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9b9a97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-[#9b9a97] text-xs text-center">
              {query ? '일치하는 노트가 없습니다' : '저장된 노트가 없습니다'}
            </p>
          </div>
        ) : (
          filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isSelected={selectedNote?.id === note.id}
              onClick={onSelect}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* 하단 도구 */}
      <div className="px-3 py-2.5 border-t border-[#e8e8e6] flex gap-1.5 shrink-0">
        <button
          onClick={handleExport}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[#9b9a97] hover:text-[#6b6a67] hover:bg-white rounded-md transition-all duration-150"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          내보내기
        </button>
        <div className="w-px bg-[#e8e8e6]" />
        <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-[#9b9a97] hover:text-[#6b6a67] hover:bg-white rounded-md transition-all duration-150 cursor-pointer">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          가져오기
          <input type="file" accept=".json" className="hidden" ref={importRef} onChange={handleImport} />
        </label>
      </div>
    </div>
  )
}

export default NoteList
