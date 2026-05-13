import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Toolbar from './Toolbar'
import { saveNote, updateNote } from '../db/db'

function NoteEditor({ selectedNote, onEditorUpdate, onSave, summary, keywords, summaryLength, restoreContent, onRestoreDone }) {
  const [title, setTitle] = useState('')
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const onEditorUpdateRef = useRef(onEditorUpdate)

  useEffect(() => { onEditorUpdateRef.current = onEditorUpdate }, [onEditorUpdate])

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: { class: 'outline-none min-h-[400px] px-16 py-6 text-[#37352f] prose-editor' },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText({ blockSeparator: '\n\n' })
      onEditorUpdateRef.current?.(text)
    },
  })

  useEffect(() => {
    if (!editor || !restoreContent) return
    editor.commands.setContent(restoreContent)
    onRestoreDone?.()
  }, [editor, restoreContent])

  useEffect(() => {
    if (!editor) return
    if (selectedNote) {
      editor.commands.setContent(selectedNote.content)
      setTitle(selectedNote.title ?? '')
    } else {
      editor.commands.setContent('')
      setTitle('')
    }
  }, [editor, selectedNote?.id])

  const handleSave = async () => {
    if (!editor) return
    setSaveError(null)
    setSaveSuccess(false)
    const content = editor.getJSON()
    try {
      if (selectedNote?.id) {
        await updateNote(selectedNote.id, {
          title,
          content,
          summary: summary ?? null,
          summaryLength: summaryLength ?? null,
          keywords: keywords ?? [],
        })
        onSave?.()
      } else {
        const newNote = await saveNote({ title, content })
        onSave?.(newNote)
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (err) {
      setSaveError(err.message)
    }
  }

  return (
    <div className="bg-white flex flex-col h-full">
      {/* 제목 영역 */}
      <div className="px-16 pt-12 pb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 없음"
          maxLength={200}
          autoComplete="off"
          className="w-full bg-transparent text-[#37352f] text-[1.875rem] font-bold placeholder-[#d3d2cf] outline-none leading-tight tracking-tight"
        />
      </div>

      {/* 툴바 + 저장 */}
      <div className="flex items-center justify-between border-b border-[#e8e8e6]">
        <Toolbar editor={editor} />
        <div className="flex items-center gap-3 px-4">
          {saveError && (
            <span className="text-xs text-red-500 truncate max-w-[180px]" title={saveError}>
              저장 실패: {saveError}
            </span>
          )}
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              저장됨
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-[#37352f] hover:bg-[#2f2d28] text-white text-xs font-medium rounded-md transition-all duration-150"
          >
            저장
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default NoteEditor
