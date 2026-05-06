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

function AuthScreen() {
  const [mode, setMode] = useState('login')
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

  const remainingAttempts = MAX_ATTEMPTS - failedCount

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-6 text-center">AI Note</h1>
        <div className="flex bg-gray-700 rounded-lg p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'login' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'signup' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            회원가입
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-gray-700 text-white text-sm px-4 py-3 rounded-lg placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <input
              type="password"
              placeholder={mode === 'signup' ? '비밀번호 (8자 이상, 대문자/숫자/특수문자 포함)' : '비밀번호'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-gray-700 text-white text-sm px-4 py-3 rounded-lg placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full bg-gray-700 text-white text-sm px-4 py-3 rounded-lg placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AuthScreen
