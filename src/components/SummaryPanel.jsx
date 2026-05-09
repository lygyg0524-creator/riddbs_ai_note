import { useState } from 'react'

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const LENGTH_OPTIONS = [
  { id: 'short', label: '짧게' },
  { id: 'medium', label: '중간' },
  { id: 'long', label: '자세히' },
]

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

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
      <div className="h-full bg-[#111111] border-l border-white/[0.06] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
            </svg>
          </div>
          <p className="text-[#4a4a4a] text-xs text-center leading-relaxed">노트를 선택하면<br />요약이 표시됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#111111] border-l border-white/[0.06]">
      {/* AI 요약 컨트롤 */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-1.5 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
          <span className="text-[10px] font-semibold text-[#4a4a4a] uppercase tracking-widest">AI 요약</span>
        </div>

        {/* 길이 옵션 */}
        <div className="flex gap-1 mb-3 p-0.5 bg-[#0a0a0a] rounded-lg border border-white/[0.06]">
          {LENGTH_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSummaryLengthChange(opt.id)}
              className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-all duration-150 ${
                summaryLength === opt.id
                  ? 'bg-[#6366f1] text-white shadow-[0_1px_4px_rgba(99,102,241,0.3)]'
                  : 'text-[#4a4a4a] hover:text-[#8a8a8a]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={onSummarize}
          disabled={isLoading}
          className="w-full py-2 flex items-center justify-center gap-2 bg-[#6366f1]/10 hover:bg-[#6366f1]/20 border border-[#6366f1]/20 hover:border-[#6366f1]/40 disabled:opacity-40 text-[#6366f1] text-xs font-medium rounded-lg transition-all duration-200"
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              요약 중...
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              AI 요약 생성
            </>
          )}
        </button>
      </div>

      {/* 요약/원문 탭 */}
      <div className="flex shrink-0 border-b border-white/[0.06]">
        <button
          onClick={() => setViewMode('summary')}
          className={`flex-1 py-2.5 text-[11px] font-medium transition-all duration-150 ${
            viewMode === 'summary'
              ? 'text-[#f0f0f0] border-b-2 border-[#6366f1] -mb-px'
              : 'text-[#4a4a4a] hover:text-[#8a8a8a]'
          }`}
        >
          요약 보기
        </button>
        <button
          onClick={() => setViewMode('original')}
          className={`flex-1 py-2.5 text-[11px] font-medium transition-all duration-150 ${
            viewMode === 'original'
              ? 'text-[#f0f0f0] border-b-2 border-[#6366f1] -mb-px'
              : 'text-[#4a4a4a] hover:text-[#8a8a8a]'
          }`}
        >
          원문 보기
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'original' ? (
          <p className="text-[#8a8a8a] text-xs leading-relaxed whitespace-pre-wrap">
            {plainText || '에디터에 내용을 입력하세요.'}
          </p>
        ) : (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-[#8a8a8a] text-xs">
                <SpinnerIcon />
                <span>요약 생성 중...</span>
              </div>
            )}
            {error && (
              <div className="px-3 py-2.5 bg-red-500/5 border border-red-500/10 rounded-lg">
                <p className="text-red-400 text-xs">{error}</p>
              </div>
            )}
            {!isLoading && !error && summary && (
              <>
                <p className="text-[#f0f0f0] text-xs leading-relaxed">{summary}</p>
                {keywords.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] text-[#4a4a4a] uppercase tracking-widest mb-2">키워드</p>
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-[11px] px-2.5 py-1 bg-[#6366f1]/8 text-[#8a8a8a] rounded-md border border-white/[0.06] hover:border-[#6366f1]/20 hover:text-[#f0f0f0] transition-all duration-150"
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
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <p className="text-[#4a4a4a] text-xs text-center leading-relaxed">
                  AI 요약 생성 버튼을 눌러<br />요약을 시작하세요 (최소 50자)
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 버전 히스토리 */}
      {selectedNote?.versions?.length > 0 && (
        <div className="border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-1.5 px-4 py-2.5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="12 8 12 12 14 14" />
              <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
            </svg>
            <span className="text-[10px] font-semibold text-[#4a4a4a] uppercase tracking-widest">버전 히스토리</span>
          </div>
          <div className="max-h-36 overflow-y-auto px-3 pb-3 space-y-0.5">
            {selectedNote.versions.map((version, i) => (
              <div
                key={i}
                onClick={() => onRestoreVersion?.(version.content)}
                className="group flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-white/[0.04] cursor-pointer border border-transparent hover:border-white/[0.06] transition-all duration-150"
              >
                <span className="text-[11px] text-[#4a4a4a] group-hover:text-[#8a8a8a] transition-colors duration-150">
                  {formatDateTime(version.savedAt)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRestoreVersion?.(version.content) }}
                  className="text-[11px] text-[#6366f1]/60 hover:text-[#6366f1] opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap ml-2"
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
