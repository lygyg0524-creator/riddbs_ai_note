import { useState, useEffect, useCallback } from 'react'
import { useNotes } from './hooks/useNotes'
import { useGeminiSummary } from './hooks/useGeminiSummary'
import { useAuth } from './hooks/useAuth'
import NoteEditor from './components/NoteEditor'
import NoteList from './components/NoteList'
import SummaryPanel from './components/SummaryPanel'
import AuthScreen from './components/AuthScreen'
import { supabase } from './lib/supabase'
import { deleteNote } from './db/db'

const TABS = [
  { id: 'list',    label: '목록' },
  { id: 'editor',  label: '에디터' },
  { id: 'summary', label: '요약' },
]

function App() {
  const user = useAuth()
  const { notes, refetch: refetchNotes } = useNotes(user?.id)
  const [selectedNote, setSelectedNote] = useState(null)
  const [showEditor, setShowEditor] = useState(false)
  const [mobileTab, setMobileTab] = useState('list')
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

  const handleEditorUpdate = useCallback(
    (text) => {
      setPlainText(text)
    },
    []
  )

  const handleSummarize = useCallback(() => {
    summarize(plainText, summaryLength, selectedNote?.id)
  }, [summarize, plainText, summaryLength, selectedNote?.id])

  if (user === undefined) {
    return (
      <div className="h-screen bg-[#f7f6f3] flex items-center justify-center">
        <p className="text-[#9b9a97] text-sm">로딩 중...</p>
      </div>
    )
  }

  if (user === null) return <AuthScreen />

  const handleLogout = () => supabase.auth.signOut()

  const handleSelect = (note) => {
    setSelectedNote(note)
    setShowEditor(true)
    setMobileTab('editor')
  }

  const handleNewNote = () => {
    setSelectedNote(null)
    setShowEditor(true)
    setMobileTab('editor')
  }

  const handleNoteSaved = (note) => {
    if (note) setSelectedNote(note)
    refetchNotes()
  }

  const handleDelete = async (id) => {
    await deleteNote(id)
    if (selectedNote?.id === id) {
      setSelectedNote(null)
      setShowEditor(false)
    }
    refetchNotes()
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
    onSummarize: handleSummarize,
    plainText,
    onRestoreVersion: setPendingRestore,
  }

  const mobilePanel = () => {
    if (mobileTab === 'list')
      return <NoteList notes={notes ?? []} selectedNote={selectedNote} onSelect={handleSelect} onDelete={handleDelete} onNewNote={handleNewNote} userEmail={user.user_metadata?.nickname ?? user.email} onLogout={handleLogout} />
    if (mobileTab === 'editor')
      return (
        <div className="h-full">
          {showEditor
            ? <NoteEditor {...sharedEditorProps} />
            : (
              <div className="flex items-center justify-center h-full text-center select-none">
                <div>
                  <p className="text-4xl mb-4">📝</p>
                  <p className="text-sm text-[#9b9a97]">노트를 선택하거나 새로 만들어 주세요</p>
                </div>
              </div>
            )
          }
        </div>
      )
    if (mobileTab === 'summary') return <SummaryPanel {...sharedSummaryProps} />
  }

  return (
    <div className="h-screen bg-[#f7f6f3] flex flex-col overflow-hidden">
      {/* 데스크톱: 3패널 */}
      <div
        className="hidden md:grid flex-1 overflow-hidden"
        style={{ gridTemplateColumns: '25% 45% 30%' }}
      >
        <NoteList notes={notes ?? []} selectedNote={selectedNote} onSelect={handleSelect} onDelete={handleDelete} onNewNote={handleNewNote} userEmail={user.user_metadata?.nickname ?? user.email} onLogout={handleLogout} />
        <div className="overflow-y-auto bg-white">
          {showEditor
            ? <NoteEditor {...sharedEditorProps} />
            : (
              <div className="flex items-center justify-center h-full text-center select-none">
                <div>
                  <p className="text-4xl mb-4">📝</p>
                  <p className="text-sm text-[#9b9a97]">노트를 선택하거나 새로 만들어 주세요</p>
                </div>
              </div>
            )
          }
        </div>
        <SummaryPanel {...sharedSummaryProps} />
      </div>

      {/* 모바일: 단일 패널 + 하단 탭 */}
      <div className="md:hidden flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">{mobilePanel()}</div>
        <nav className="flex border-t border-[#e8e8e6] bg-white shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mobileTab === tab.id
                  ? 'text-[#37352f] border-t-2 border-[#37352f] -mt-px'
                  : 'text-[#9b9a97]'
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
