import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Toolbar from './Toolbar'
import { saveNote, updateNote } from '../db/db'

function NoteEditor({ selectedNote, onEditorUpdate, onSave, summary, keywords, summaryLength, restoreContent, onRestoreDone }) {
  const [title, setTitle] = useState('')
  const [saveError, setSaveError] = useState(null)
  const onEditorUpdateRef = useRef(onEditorUpdate)

  useEffect(() => {
    onEditorUpdateRef.current = onEditorUpdate
  }, [onEditorUpdate])

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[400px] px-16 py-6 text-[#e8e8e8] prose-editor',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText({ blockSeparator: '\n\n' })
      onEditorUpdateRef.current?.(text)
    },
  })

  // 버전 복원 요청 처리
  useEffect(() => {
    if (!editor || !restoreContent) return
    editor.commands.setContent(restoreContent)
    onRestoreDone?.()
  }, [editor, restoreContent])

  // 선택된 노트 변경 시 에디터 동기화
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
      } else {
        const newNote = await saveNote({ title, content })
        onSave?.(newNote)
      }
    } catch (err) {
      setSaveError(err.message)
    }
  }

  return (
    <div className="bg-[#191919] flex flex-col h-full">
      {/* 제목 영역 */}
      <div className="px-16 pt-10 pb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 없음"
          maxLength={200}
          autoComplete="off"
          className="w-full bg-transparent text-[#e8e8e8] text-3xl font-bold placeholder-[#373737] outline-none"
        />
      </div>

      {/* 툴바 + 저장 버튼 행 */}
      <div className="flex items-center justify-between border-b border-[#373737]">
        <Toolbar editor={editor} />
        <div className="flex items-center gap-3 px-4">
          {saveError && (
            <span className="text-xs text-red-400 truncate max-w-[180px]" title={saveError}>
              저장 실패: {saveError}
            </span>
          )}
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-[#2383e2] hover:bg-[#1a6bc7] text-white text-xs font-medium rounded-sm transition-colors"
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
