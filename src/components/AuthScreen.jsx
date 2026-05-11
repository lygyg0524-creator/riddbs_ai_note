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
      className="w-full bg-white border border-[#e8e8e6] text-[#37352f] text-sm px-3.5 py-2.5 rounded-md placeholder-[#b4b4af] outline-none focus:border-[#a0a0ff] focus:ring-2 focus:ring-[#6366f1]/10 transition-all duration-150"
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
    <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        <div className="bg-white border border-[#e8e8e6] rounded-xl p-8 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-7">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-[#9b9a97] hover:text-[#37352f] text-sm transition-colors duration-150"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              돌아가기
            </button>
            <div className="w-px h-4 bg-[#e8e8e6]" />
            <h1 className="text-sm font-semibold text-[#37352f]">비밀번호 찾기</h1>
          </div>
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-[#9b9a97] leading-relaxed">
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
                  ? 'text-red-500 bg-red-50 border-red-100'
                  : 'text-emerald-600 bg-emerald-50 border-emerald-100'
              }`}>
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#37352f] hover:bg-[#2f2d28] disabled:opacity-40 text-white text-sm font-medium rounded-md transition-all duration-150"
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
    <div className="min-h-screen bg-[#f7f6f3] flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#37352f] flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <span className="text-[#37352f] text-base font-semibold tracking-tight">AI Note</span>
        </div>

        {/* 카드 */}
        <div className="bg-white border border-[#e8e8e6] rounded-xl shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          {/* 탭 헤더 */}
          <div className="flex border-b border-[#e8e8e6]">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-150 rounded-tl-xl ${
                mode === 'login'
                  ? 'text-[#37352f] border-b-2 border-[#37352f] -mb-px'
                  : 'text-[#9b9a97] hover:text-[#6b6a67]'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => switchMode('signup')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors duration-150 rounded-tr-xl ${
                mode === 'signup'
                  ? 'text-[#37352f] border-b-2 border-[#37352f] -mb-px'
                  : 'text-[#9b9a97] hover:text-[#6b6a67]'
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
                    ? 'text-red-500 bg-red-50 border-red-100'
                    : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                }`}>
                  {message.text}
                </p>
              )}
              {mode === 'login' && failedCount > 0 && failedCount < MAX_ATTEMPTS && (
                <p className="text-xs text-amber-600 px-1">남은 시도 횟수: {remainingAttempts}회</p>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#37352f] hover:bg-[#2f2d28] disabled:opacity-40 text-white text-sm font-medium rounded-md transition-all duration-150"
                >
                  {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
                </button>
              </div>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="w-full text-xs text-[#9b9a97] hover:text-[#6b6a67] transition-colors duration-150 pt-0.5"
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
