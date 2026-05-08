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
        class: 'outline-none min-h-[400px] p-4 text-gray-100 prose-editor',
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
    <div className="bg-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-700">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="노트 제목을 입력하세요"
          maxLength={200}
          autoComplete="off"
          className="flex-1 bg-transparent text-white text-lg font-medium placeholder-gray-500 outline-none"
        />
        {saveError && (
          <span className="text-xs text-red-400 truncate max-w-[200px]" title={saveError}>
            저장 실패: {saveError}
          </span>
        )}
        <button
          onClick={handleSave}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          저장
        </button>
      </div>
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-inset transition-shadow">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default NoteEditor
