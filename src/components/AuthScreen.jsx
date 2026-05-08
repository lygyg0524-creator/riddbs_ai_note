import { useState } from 'react'
import { supabase } from '../lib/supabase'

// A07 - 클라이언트 로그인 시도 횟수 제한 (모듈 스코프, 탭 세션 내 유지)
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

// A04 - 비밀번호 강도 정책
function validatePassword(password) {
  if (password.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다'
  if (!/[A-Z]/.test(password) && !/[0-9]/.test(password) && !/[!@#$%^&*(),.?":{}|<>_\-]/.test(password))
    return '영문 대문자, 숫자, 특수문자 중 하나 이상을 포함해야 합니다'
  return null
}

function RecoveryScreen({ onBack }) {
  const [tab, setTab] = useState('id')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  function switchTab(next) {
    setTab(next)
    setMessage(null)
    setEmail('')
  }

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
      setMessage({ type: 'success', text: '비밀번호 재설정 링크를 이메일로 발송했습니다. 받은 편지함을 확인해 주세요.' })
      setEmail('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#202020] rounded border border-[#373737] p-8">
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="text-[#9b9a97] hover:text-[#e8e8e8] text-sm mr-3 transition-colors"
          >
            ← 돌아가기
          </button>
          <h1 className="text-base font-semibold text-[#e8e8e8]">계정 찾기</h1>
        </div>

        {/* 언더라인 탭 */}
        <div className="flex border-b border-[#373737] mb-6">
          <button
            onClick={() => switchTab('id')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'id'
                ? 'text-[#e8e8e8] border-b-2 border-[#2383e2] -mb-px'
                : 'text-[#9b9a97] hover:text-[#e8e8e8]'
            }`}
          >
            아이디 찾기
          </button>
          <button
            onClick={() => switchTab('password')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'password'
                ? 'text-[#e8e8e8] border-b-2 border-[#2383e2] -mb-px'
                : 'text-[#9b9a97] hover:text-[#e8e8e8]'
            }`}
          >
            비밀번호 찾기
          </button>
        </div>

        {tab === 'id' ? (
          <div className="space-y-4">
            <div className="bg-[#2f2f2f] rounded p-4 space-y-2">
              <p className="text-sm font-medium text-[#e8e8e8]">이 앱의 아이디는 이메일 주소입니다</p>
              <p className="text-xs text-[#9b9a97] leading-relaxed">
                회원가입 시 입력한 이메일 주소가 곧 로그인 아이디입니다.
                가입에 사용했을 것 같은 이메일 주소로 로그인을 시도해 보세요.
              </p>
            </div>
            <button
              onClick={onBack}
              className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a6bc7] text-white text-sm font-medium rounded transition-colors"
            >
              로그인 화면으로 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-[#9b9a97]">
              가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.
            </p>
            <input
              type="email"
              placeholder="가입한 이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#2f2f2f] text-[#e8e8e8] text-sm px-4 py-2.5 rounded placeholder-[#6b6b6b] outline-none focus:ring-1 focus:ring-[#2383e2]"
            />
            {message && (
              <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {message.text}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a6bc7] disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
            >
              {loading ? '처리 중...' : '재설정 링크 보내기'}
            </button>
          </form>
        )}
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
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  function switchMode(next) {
    setMode(next)
    setMessage(null)
    setPassword('')
    setPasswordConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage(null)

    try {
      checkRateLimit()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      return
    }

    if (mode === 'signup') {
      const pwError = validatePassword(password)
      if (pwError) { setMessage({ type: 'error', text: pwError }); return }
      if (password !== passwordConfirm) {
        setMessage({ type: 'error', text: '비밀번호가 일치하지 않습니다' })
        return
      }
    }

    setLoading(true)

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) {
      recordFailure()
      setMessage({ type: 'error', text: error.message })
    } else if (mode === 'signup') {
      setMessage({ type: 'success', text: '이메일을 확인해 인증 링크를 클릭해주세요.' })
    } else {
      failedCount = 0
      lockUntil = 0
    }
    setLoading(false)
  }

  if (showRecovery) {
    return <RecoveryScreen onBack={() => setShowRecovery(false)} />
  }

  const remainingAttempts = MAX_ATTEMPTS - failedCount

  return (
    <div className="min-h-screen bg-[#191919] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#202020] rounded border border-[#373737] p-8">
        <h1 className="text-base font-semibold text-[#e8e8e8] mb-6 text-center">AI Note</h1>

        {/* 언더라인 탭 */}
        <div className="flex border-b border-[#373737] mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'text-[#e8e8e8] border-b-2 border-[#2383e2] -mb-px'
                : 'text-[#9b9a97] hover:text-[#e8e8e8]'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'text-[#e8e8e8] border-b-2 border-[#2383e2] -mb-px'
                : 'text-[#9b9a97] hover:text-[#e8e8e8]'
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3" autoComplete="on">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-[#2f2f2f] text-[#e8e8e8] text-sm px-4 py-2.5 rounded placeholder-[#6b6b6b] outline-none focus:ring-1 focus:ring-[#2383e2]"
          />
          <div>
            <input
              type="password"
              placeholder={mode === 'signup' ? '비밀번호 (8자 이상, 대문자/숫자/특수문자 포함)' : '비밀번호'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-[#2f2f2f] text-[#e8e8e8] text-sm px-4 py-2.5 rounded placeholder-[#6b6b6b] outline-none focus:ring-1 focus:ring-[#2383e2]"
            />
          </div>
          {mode === 'signup' && (
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-[#2f2f2f] text-[#e8e8e8] text-sm px-4 py-2.5 rounded placeholder-[#6b6b6b] outline-none focus:ring-1 focus:ring-[#2383e2]"
            />
          )}
          {message && (
            <p className={`text-sm ${message.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {message.text}
            </p>
          )}
          {mode === 'login' && failedCount > 0 && failedCount < MAX_ATTEMPTS && (
            <p className="text-xs text-yellow-500">
              남은 시도 횟수: {remainingAttempts}회
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2383e2] hover:bg-[#1a6bc7] disabled:opacity-50 text-white text-sm font-medium rounded transition-colors"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setShowRecovery(true)}
              className="w-full text-xs text-[#6b6b6b] hover:text-[#9b9a97] transition-colors pt-1"
            >
              아이디 / 비밀번호 찾기
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default AuthScreen
