import { useState, useCallback } from 'react'
import { updateNoteSummary } from '../db/db'

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const SUMMARY_CONFIG = {
  short:  { sentences: 1, keywords: 3 },
  medium: { sentences: 3, keywords: 5 },
  long:   { sentences: 5, keywords: 8 },
}

async function callGeminiAPI(text, summaryLength) {
  const { sentences, keywords } = SUMMARY_CONFIG[summaryLength]
  const prompt =
    `아래 노트를 한국어로 ${sentences}문장 이내로 요약하고, 핵심 키워드를 ${keywords}개 이내로 추출해줘. ` +
    `JSON 형식으로만 응답해줘: {"summary": "요약문", "keywords": ["키워드1", "키워드2"]}\n\n${text}`

  const res = await fetch(`${API_URL}?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })

  if (!res.ok) {
    const err = new Error('API error')
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const jsonStr = raw.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(jsonStr)
}

export function useGeminiSummary() {
  const [summary, setSummary] = useState(null)
  const [keywords, setKeywords] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const summarize = useCallback(async (text, summaryLength, noteId) => {
    const trimmed = text?.trim() ?? ''
    if (trimmed.length < 50) {
      setError('노트 내용이 너무 짧습니다. (최소 50자)')
      return
    }

    const truncated = trimmed.slice(0, 3000)
    setIsLoading(true)
    setError(null)

    const doCall = async () => {
      const result = await callGeminiAPI(truncated, summaryLength)
      setSummary(result.summary)
      setKeywords(result.keywords ?? [])
      if (noteId) {
        await updateNoteSummary(noteId, {
          summary: result.summary,
          summaryLength,
          keywords: result.keywords ?? [],
        })
      }
    }

    let retrying = false
    try {
      await doCall()
    } catch (err) {
      if (err.status === 429) {
        retrying = true
        setError('잠시 후 다시 시도합니다...')
        setTimeout(async () => {
          try {
            await doCall()
            setError(null)
          } catch {
            setError('요약 생성에 실패했습니다')
          } finally {
            setIsLoading(false)
          }
        }, 2000)
      } else {
        setError('요약 생성에 실패했습니다')
      }
    } finally {
      if (!retrying) setIsLoading(false)
    }
  }, [])

  return { summarize, summary, setSummary, keywords, setKeywords, isLoading, error }
}
