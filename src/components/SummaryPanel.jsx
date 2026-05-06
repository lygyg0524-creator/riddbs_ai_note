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
  plainText,
  onRestoreVersion,
}) {
  const [viewMode, setViewMode] = useState('summary')

  if (!selectedNote) {
    return (
      <div className="h-full bg-gray-900 border-l border-gray-700 flex items-center justify-center p-4">
        <p className="text-gray-500 text-sm text-center">노트를 선택하면 요약이 표시됩니다</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-l border-gray-700">
      {/* 요약 길이 선택 */}
      <div className="px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">AI 요약</h2>
        <div className="flex gap-1">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSummaryLengthChange(opt.id)}
              className={`flex-1 py-1 text-xs font-medium rounded transition-colors ${
                summaryLength === opt.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 원문/요약 토글 */}
      <div className="flex border-b border-gray-700 shrink-0">
        <button
          onClick={() => setViewMode('summary')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            viewMode === 'summary'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          요약 보기
        </button>
        <button
          onClick={() => setViewMode('original')}
          className={`flex-1 py-2 text-xs font-medium transition-colors ${
            viewMode === 'original'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          원문 보기
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'original' ? (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {plainText || '에디터에 내용을 입력하세요.'}
          </p>
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span className="animate-spin inline-block">⟳</span>
                <span>요약 생성 중...</span>
              </div>
            )}
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            {!isLoading && !error && summary && (
              <>
                <p className="text-gray-100 text-sm leading-relaxed">{summary}</p>
                {keywords.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">키워드</p>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs px-2 py-1 bg-blue-900 text-blue-300 rounded-full"
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
              <p className="text-gray-500 text-sm">
                노트 내용을 입력하면 자동으로 요약됩니다. (최소 50자)
              </p>
            )}
          </>
        )}
      </div>
      {/* 버전 히스토리 */}
      {selectedNote?.versions?.length > 0 && (
        <div className="border-t border-gray-700 shrink-0">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400">버전 히스토리</p>
          <div className="max-h-40 overflow-y-auto px-4 pb-3 space-y-1">
            {selectedNote.versions.map((version, i) => (
              <div
                key={i}
                onClick={() => onRestoreVersion?.(version.content)}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-800 cursor-pointer group"
              >
                <span className="text-xs text-gray-400">{formatDateTime(version.savedAt)}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRestoreVersion?.(version.content) }}
                  className="text-xs text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-2"
                >
                  이 버전으로 복원
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
