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

function NoteCard({ note, isSelected, onClick, onDelete }) {
  const preview = getPreview(note)
  const keywords = note.keywords?.slice(0, 3) ?? []

  function handleDelete(e) {
    e.stopPropagation()
    if (window.confirm(`"${note.title || '제목 없음'}" 노트를 삭제할까요?`)) {
      onDelete(note.id)
    }
  }

  return (
    <div
      onClick={() => onClick(note)}
      className={`group relative w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-700' : 'hover:bg-gray-700'
      }`}
    >
      <p className="font-medium text-white truncate text-sm pr-6">
        {note.title || '제목 없음'}
      </p>
      {preview && (
        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preview}</p>
      )}
      {keywords.length > 0 && (
        <div className="flex gap-1 mt-2 flex-wrap">
          {keywords.map((kw) => (
            <span key={kw} className="text-xs px-1.5 py-0.5 bg-gray-600 text-gray-300 rounded">
              {kw}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-1.5">{formatDate(note.updatedAt)}</p>
      <button
        onClick={handleDelete}
        className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity text-sm leading-none p-0.5"
        title="삭제"
      >
        ×
      </button>
    </div>
  )
}

function NoteList({ notes = [], selectedNote, onSelect, onDelete, userEmail, onLogout }) {
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
      // 파일 크기 제한 (5MB) — DoS 방지
      const MAX_SIZE = 5 * 1024 * 1024
      if (file.size > MAX_SIZE)
        throw new Error(`파일 크기가 너무 큽니다 (최대 5MB, 현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)`)

      // 확장자 검증 — 타입 스푸핑 방지
      const ext = file.name.split('.').pop().toLowerCase()
      if (ext !== 'json')
        throw new Error('JSON 파일(.json)만 가져올 수 있습니다')

      // MIME 타입 이중 검증 (OS마다 다를 수 있어 빈 문자열도 허용)
      const ALLOWED_MIME = ['application/json', 'text/plain', 'text/json', '']
      if (!ALLOWED_MIME.includes(file.type))
        throw new Error('지원하지 않는 파일 형식입니다')

      const text = await file.text()

      // 파싱 전 구조 사전 검사 — 비정상 파일 조기 차단
      if (!text.trim().startsWith('['))
        throw new Error('배열 형식의 JSON 파일이 아닙니다')

      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error('JSON 파싱 실패. 파일이 손상되었거나 형식이 올바르지 않습니다')
      }

      if (!Array.isArray(data)) throw new Error('배열 형식이 아닙니다')

      // 배열 항목 수 제한 (500개) — 대량 데이터 DoS 방지
      if (data.length > 500)
        throw new Error(`한 번에 최대 500개까지 가져올 수 있습니다 (현재 ${data.length}개)`)

      const ALLOWED = ['id', 'title', 'content', 'summary', 'summaryLength', 'keywords', 'versions', 'createdAt', 'updatedAt']
      const cleaned = data.map((note, i) => {
        // 타입 검증
        if (typeof note !== 'object' || note === null) throw new Error(`${i + 1}번째 항목이 올바르지 않습니다`)
        if (typeof note.content !== 'object' || note.content === null) throw new Error(`${i + 1}번째 노트에 content가 없거나 올바르지 않습니다`)
        if (note.title !== undefined && typeof note.title !== 'string') throw new Error(`${i + 1}번째 노트의 title이 올바르지 않습니다`)
        if (note.summary !== undefined && note.summary !== null && typeof note.summary !== 'string') throw new Error(`${i + 1}번째 노트의 summary가 올바르지 않습니다`)
        if (note.keywords !== undefined && !Array.isArray(note.keywords)) throw new Error(`${i + 1}번째 노트의 keywords가 올바르지 않습니다`)
        if (note.versions !== undefined && !Array.isArray(note.versions)) throw new Error(`${i + 1}번째 노트의 versions가 올바르지 않습니다`)

        // 필드 길이 제한 — 대용량 페이로드 공격 방지
        if (note.title?.length > 200) throw new Error(`${i + 1}번째 노트의 제목이 너무 깁니다 (최대 200자)`)
        if (note.summary?.length > 5000) throw new Error(`${i + 1}번째 노트의 요약이 너무 깁니다 (최대 5000자)`)
        if (note.keywords?.length > 20) throw new Error(`${i + 1}번째 노트의 키워드가 너무 많습니다 (최대 20개)`)

        // 허용 필드만 추출 (prototype pollution 방지), versions는 최대 10개로 자름
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

  const fuse = useMemo(
    () =>
      new Fuse(notes, {
        keys: ['title', 'summary', 'keywords'],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [notes]
  )

  const filtered = useMemo(
    () => (query.trim() ? fuse.search(query).map((r) => r.item) : notes),
    [fuse, query, notes]
  )

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-300">노트 목록</h2>
          <button
            onClick={onLogout}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            로그아웃
          </button>
        </div>
        {userEmail && (
          <p className="text-xs text-gray-500 truncate mb-2">{userEmail}</p>
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색..."
          className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded-lg placeholder-gray-500 outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            {query ? '일치하는 노트가 없습니다' : '저장된 노트가 없습니다'}
          </p>
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
      <div className="p-3 border-t border-gray-700 flex gap-2 shrink-0">
        <button
          onClick={handleExport}
          className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          전체 내보내기
        </button>
        <label className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors text-center cursor-pointer">
          가져오기
          <input type="file" accept=".json" className="hidden" ref={importRef} onChange={handleImport} />
        </label>
      </div>
    </div>
  )
}

export default NoteList
