Gemini API(gemini-2.0-flash)로 노트를 요약하는 함수를 만들어줘. API 키는 import.meta.env.VITE_GEMINI_API_KEY. 입력은 editor.getText()로 추출한 순수 텍스트만 사용. 응답은 JSON 형식(summary, keywords 배열)으로 받아줘. 800ms 디바운스 적용.
