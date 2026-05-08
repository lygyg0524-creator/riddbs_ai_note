import { useState, useEffect, useCallback } from 'react'
import { useNotes } from './hooks/useNotes'
import { useGeminiSummary } from './hooks/useGeminiSummary'
import { useAuth } from './hooks/useAuth'
import NoteEditor from './components/NoteEditor'
import NoteList from './components/NoteList'
import SummaryPanel from './components/SummaryPanel'
import AuthScreen from './components/AuthScreen'
import { supabase } from './lib/supabase'

const TABS = [
  { id: 'list',    label: '목록' },
  { id: 'editor',  label: '에디터' },
  { id: 'summary', label: '요약' },
]

function App() {
  const user = useAuth()
  const notes = useNotes()
  const [selectedNote, setSelectedNote] = useState(null)
  const [mobileTab, setMobileTab] = useState('editor')
  const [summaryLength, setSummaryLength] = useState('medium')
  const [plainText, setPlainText] = useState('')

  const { summarize, summary, setSummary, keywords, setKeywords, isLoading, error } =
    useGeminiSummary()
  const [pendingRestore, setPendingRestore] = useState(null)

  // notes 갱신 시 selectedNote 동기화 (realtime 업데이트 반영)
  useEffect(() => {
    if (!selectedNote || !notes) return
    const updated = notes.find(n => n.id === selectedNote.id)
    if (updated) setSelectedNote(updated)
  }, [notes])

  // 노트 선택 시 요약 상태 동기화
  useEffect(() => {
    if (selectedNote) {
      setSummary(selectedNote.summary ?? null)
      setKeywords(selectedNote.keywords ?? [])
      setSummaryLength(selectedNote.summaryLength ?? 'medium')
    } else {
      setSummary(null)
      setKeywords([])
    }
  }, [selectedNote?.id])

  // 요약 길이 변경 시 재요약
  useEffect(() => {
    if (plainText.trim().length >= 50) {
      summarize(plainText, summaryLength, selectedNote?.id)
    }
  }, [summaryLength])

  const handleEditorUpdate = useCallback(
    (text) => {
      setPlainText(text)
      summarize(text, summaryLength, selectedNote?.id)
    },
    [summarize, summaryLength, selectedNote?.id]
  )

  if (user === undefined) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    )
  }

  if (user === null) return <AuthScreen />

  const handleLogout = () => supabase.auth.signOut()

  const handleSelect = (note) => {
    setSelectedNote(note)
    setMobileTab('editor')
  }

  const handleNoteSaved = (note) => {
    setSelectedNote(note)
  }

  const sharedEditorProps = {
    selectedNote,
    onEditorUpdate: handleEditorUpdate,
    onSave: handleNoteSaved,
    summary,
    keywords,
    summaryLength,
    restoreContent: pendingRestore,
    onRestoreDone: () => setPendingRestore(null),
  }

  const sharedSummaryProps = {
    selectedNote,
    summary,
    keywords,
    isLoading,
    error,
    summaryLength,
    onSummaryLengthChange: setSummaryLength,
    plainText,
    onRestoreVersion: setPendingRestore,
  }

  const mobilePanel = () => {
    if (mobileTab === 'list')
      return <NoteList notes={notes ?? []} selectedNote={selectedNote} onSelect={handleSelect} userEmail={user.email} onLogout={handleLogout} />
    if (mobileTab === 'editor')
      return (
        <div className="p-4 h-full">
          <NoteEditor {...sharedEditorProps} />
        </div>
      )
    if (mobileTab === 'summary') return <SummaryPanel {...sharedSummaryProps} />
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* 데스크톱: 3패널 */}
      <div
        className="hidden md:grid flex-1 overflow-hidden"
        style={{ gridTemplateColumns: '25% 45% 30%' }}
      >
        <NoteList notes={notes ?? []} selectedNote={selectedNote} onSelect={handleSelect} userEmail={user.email} onLogout={handleLogout} />
        <div className="p-4 overflow-y-auto">
          <NoteEditor {...sharedEditorProps} />
        </div>
        <SummaryPanel {...sharedSummaryProps} />
      </div>

      {/* 모바일: 단일 패널 + 하단 탭 */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">{mobilePanel()}</div>
        <nav className="flex border-t border-gray-700 bg-gray-800 shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mobileTab === tab.id
                  ? 'text-blue-400 border-t-2 border-blue-400 -mt-px'
                  : 'text-gray-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default App
