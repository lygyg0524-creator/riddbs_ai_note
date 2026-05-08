import { useState } from 'react'

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const LENGTH_OPTIONS = [
  { id: 'short',  label: '짧게' },
  { id: 'medium', label: '중간' },
  { id: 'long',   label: '자세히' },
]

function SummaryPanel({
  selectedNote,
  summary,
  keywords,
  isLoading,
  error,
  summaryLength,
  onSummaryLengthChange,
  onSummarize,
  plainText,
  onRestoreVersion,
}) {
  const [viewMode, setViewMode] = useState('summary')

  if (!selectedNote) {
    return (
      <div className="h-full bg-[#191919] border-l border-[#373737] flex items-center justify-center p-4">
        <p className="text-[#6b6b6b] text-sm text-center">노트를 선택하면 요약이 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#191919] border-l border-[#373737]">
      {/* 요약 길이 선택 + 요약 버튼 */}
      <div className="px-4 py-3 border-b border-[#373737]">
        <h2 className="text-xs font-semibold text-[#9b9a97] uppercase tracking-wider mb-2">AI 요약</h2>
        <div className="flex gap-1 mb-2">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSummaryLengthChange(opt.id)}
              className={`flex-1 py-1 text-xs font-medium rounded-sm transition-colors ${
                summaryLength === opt.id
                  ? 'bg-[#2383e2] text-white'
                  : 'bg-[#2f2f2f] text-[#9b9a97] hover:text-[#e8e8e8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={onSummarize}
          disabled={isLoading}
          className="w-full py-1.5 bg-[#2383e2] hover:bg-[#1a6bc7] disabled:opacity-50 text-white text-xs font-medium rounded-sm transition-colors"
        >
          {isLoading ? '요약 중...' : 'AI 요약 생성'}
        </button>
      </div>

      {/* 원문/요약 토글 */}
      <div className="flex border-b border-[#373737] shrink-0">
        <button
          onClick={() => setViewMode('summary')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            viewMode === 'summary'
              ? 'text-[#e8e8e8] border-b-2 border-[#2383e2] -mb-px'
              : 'text-[#6b6b6b] hover:text-[#9b9a97]'
          }`}
        >
          요약 보기
        </button>
        <button
          onClick={() => setViewMode('original')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            viewMode === 'original'
              ? 'text-[#e8e8e8] border-b-2 border-[#2383e2] -mb-px'
              : 'text-[#6b6b6b] hover:text-[#9b9a97]'
          }`}
        >
          원문 보기
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'original' ? (
          <p className="text-[#9b9a97] text-sm leading-relaxed whitespace-pre-wrap">
            {plainText || '에디터에 내용을 입력하세요.'}
          </p>
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-[#9b9a97] text-sm">
                <span className="animate-spin inline-block">⟳</span>
                <span>요약 생성 중...</span>
              </div>
            )}
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            {!isLoading && !error && summary && (
              <>
                <p className="text-[#e8e8e8] text-sm leading-relaxed">{summary}</p>
                {keywords.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-[#6b6b6b] mb-2">키워드</p>
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs px-2 py-0.5 bg-[#2f2f2f] text-[#9b9a97] rounded-sm border border-[#373737]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {!isLoading && !error && !summary && (
              <p className="text-[#6b6b6b] text-sm">
                위의 AI 요약 생성 버튼을 눌러 요약을 생성하세요. (최소 50자)
              </p>
            )}
          </>
        )}
      </div>

      {/* 버전 히스토리 */}
      {selectedNote?.versions?.length > 0 && (
        <div className="border-t border-[#373737] shrink-0">
          <p className="px-4 py-2 text-xs font-semibold text-[#6b6b6b] uppercase tracking-wider">버전 히스토리</p>
          <div className="max-h-40 overflow-y-auto px-4 pb-3 space-y-0.5">
            {selectedNote.versions.map((version, i) => (
              <div
                key={i}
                onClick={() => onRestoreVersion?.(version.content)}
                className="flex items-center justify-between py-1.5 px-2 rounded-sm hover:bg-[#2f2f2f] cursor-pointer group"
              >
                <span className="text-xs text-[#6b6b6b]">{formatDateTime(version.savedAt)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRestoreVersion?.(version.content) }}
                  className="text-xs text-[#2383e2] hover:text-[#5ba3f5] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2"
                >
                  복원
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SummaryPanel
