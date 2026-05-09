import { useState } from 'react'
import { supabase } from '../lib/supabase'

let failedCount = 0
let lockUntil = 0
const MAX_ATTEMPTS = 5
const LOCK_MS = 15 * 60 * 1000

function checkRateLimit() {
  if (lockUntil && Date.now() < lockUntil) {
    const remaining = Math.ceil((lockUntil - Date.now()) / 1000)
    throw new Error(`로그인 시도 횟수 초과. ${remaining}초 후 다시 시도하세요.`)
  }
  if (lockUntil && Date.now() >= lockUntil) {
    failedCount = 0
    lockUntil = 0
  }
}

function recordFailure() {
  failedCount++
  if (failedCount >= MAX_ATTEMPTS) lockUntil = Date.now() + LOCK_MS
}

function validatePassword(password) {
  if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다'
  if (!/[A-Z]/.test(password) && !/[0-9]/.test(password) && !/[!@#$%^&*(),.?":{}|<>_\-]/.test(password))
    return '영문 대문자, 숫자, 특수문자 중 하나 이상을 포함해야 합니다'
  return null
}

function InputField({ type, placeholder, value, onChange, required, autoComplete, maxLength }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      autoComplete={autoComplete}
      maxLength={maxLength}
      className="w-full bg-[#0a0a0a] border border-white/[0.08] text-[#f0f0f0] text-sm px-4 py-2.5 rounded-md placeholder-[#4a4a4a] outline-none focus:border-[#6366f1]/60 focus:ring-2 focus:ring-[#6366f1]/15 transition-all duration-200"
    />
  )
}

function RecoveryScreen({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handlePasswordReset(e) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: '비밀번호 재설정 링크를 이메일로 발송했습니다.' })
      setEmail('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_60%)] pointer-events-none" />
      <div className="relative w-full max-w-sm">
        <div className="bg-[#111111] border border-white/[0.07] rounded-xl p-8 shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_4px_32px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[#8a8a8a] hover:text-[#f0f0f0] text-sm transition-colors duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              돌아가기
            </button>
            <div className="w-px h-4 bg-white/[0.08]" />
            <h1 className="text-sm font-semibold text-[#f0f0f0]">비밀번호 찾기</h1>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-[#8a8a8a] leading-relaxed">
              가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <InputField
              type="email"
              placeholder="가입한 이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {message && (
              <p className={`text-xs px-3 py-2 rounded-md border ${
                message.type === 'error'
                  ? 'text-red-400 bg-red-500/5 border-red-500/10'
                  : 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
              }`}>
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#6366f1] hover:bg-[#4f52d1] disabled:opacity-40 text-white text-sm font-medium rounded-md transition-all duration-200 shadow-[0_2px_8px_rgba(99,102,241,0.25)]"
            >
              {loading ? '처리 중...' : '재설정 링크 보내기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [showRecovery, setShowRecovery] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  function switchMode(next) {
    setMode(next)
    setMessage(null)
    setPassword('')
    setPasswordConfirm('')
    setNickname('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)
    try { checkRateLimit() } catch (err) { setMessage({ type: 'error', text: err.message }); return }
    if (mode === 'signup') {
      if (!nickname.trim()) { setMessage({ type: 'error', text: '닉네임을 입력해주세요' }); return }
      if (nickname.trim().length > 20) { setMessage({ type: 'error', text: '닉네임은 최대 20자까지 입력할 수 있습니다' }); return }
      const pwError = validatePassword(password)
      if (pwError) { setMessage({ type: 'error', text: pwError }); return }
      if (password !== passwordConfirm) { setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다' }); return }
    }
    setLoading(true)
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { nickname: nickname.trim() } } })
    if (error) { recordFailure(); setMessage({ type: 'error', text: error.message }) }
    else if (mode === 'signup') { setMessage({ type: 'success', text: '이메일을 확인해 인증 링크를 클릭해주세요.' }) }
    else { failedCount = 0; lockUntil = 0 }
    setLoading(false)
  }

  if (showRecovery) return <RecoveryScreen onBack={() => setShowRecovery(false)} />
  const remainingAttempts = MAX_ATTEMPTS - failedCount

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      {/* 배경 그라디언트 — subtle 인디고 광원 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(99,102,241,0.08)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(99,102,241,0.04)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative w-full max-w-sm">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <span className="text-[#f0f0f0] text-base font-semibold tracking-tight">AI Note</span>
        </div>

        {/* 카드 */}
        <div className="bg-[#111111] border border-white/[0.07] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_8px_40px_rgba(0,0,0,0.5)]">
          {/* 탭 헤더 */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-150 rounded-tl-xl ${
                mode === 'login'
                  ? 'text-[#f0f0f0] border-b-2 border-[#6366f1] -mb-px'
                  : 'text-[#4a4a4a] hover:text-[#8a8a8a]'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-150 rounded-tr-xl ${
                mode === 'signup'
                  ? 'text-[#f0f0f0] border-b-2 border-[#6366f1] -mb-px'
                  : 'text-[#4a4a4a] hover:text-[#8a8a8a]'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 폼 */}
          <div className="p-7">
            <form onSubmit={handleSubmit} className="space-y-3" autoComplete="on">
              <InputField
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <InputField
                type="password"
                placeholder={mode === 'signup' ? '비밀번호 (8자 이상, 대문자/숫자/특수문자 포함)' : '비밀번호'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && (
                <>
                  <InputField
                    type="password"
                    placeholder="비밀번호 확인"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <InputField
                    type="text"
                    placeholder="닉네임 (최대 20자)"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                    maxLength={20}
                    autoComplete="nickname"
                  />
                </>
              )}

              {message && (
                <p className={`text-xs px-3 py-2 rounded-md border ${
                  message.type === 'error'
                    ? 'text-red-400 bg-red-500/5 border-red-500/10'
                    : 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
                }`}>
                  {message.text}
                </p>
              )}
              {mode === 'login' && failedCount > 0 && failedCount < MAX_ATTEMPTS && (
                <p className="text-xs text-amber-500/80 px-1">남은 시도 횟수: {remainingAttempts}회</p>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#6366f1] hover:bg-[#4f52d1] disabled:opacity-40 text-white text-sm font-medium rounded-md transition-all duration-200 shadow-[0_2px_12px_rgba(99,102,241,0.3)]"
                >
                  {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                </button>
              </div>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="w-full text-xs text-[#4a4a4a] hover:text-[#8a8a8a] transition-colors duration-150 pt-0.5"
                >
                  비밀번호 찾기
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthScreen
