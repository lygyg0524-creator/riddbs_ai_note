function ToolbarBtn({ onClick, isActive, title, children }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-600 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-700 flex-wrap">
      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="볼드"
      >
        <strong>B</strong>
      </ToolbarBtn>

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="이탤릭"
      >
        <em>I</em>
      </ToolbarBtn>

      <div className="w-px h-5 bg-gray-600 mx-1" />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="제목 1"
      >
        H1
      </ToolbarBtn>

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="제목 2"
      >
        H2
      </ToolbarBtn>

      <div className="w-px h-5 bg-gray-600 mx-1" />

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="불릿 목록"
      >
        ≡
      </ToolbarBtn>

      <ToolbarBtn
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="번호 목록"
      >
        1.
      </ToolbarBtn>
    </div>
  )
}

export default Toolbar
