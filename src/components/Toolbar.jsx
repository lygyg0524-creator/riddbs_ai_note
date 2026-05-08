function ToolbarBtn({ onClick, isActive, title, children }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`px-2 py-1 rounded-sm text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#2383e2] text-white'
          : 'text-[#9b9a97] hover:bg-[#2f2f2f] hover:text-[#e8e8e8]'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }) {
  if (!editor) return null

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 flex-wrap">
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

      <div className="w-px h-4 bg-[#373737] mx-1" />

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

      <div className="w-px h-4 bg-[#373737] mx-1" />

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
