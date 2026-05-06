# ai-note-app

## 기술 스택
- React 19
- Tailwind CSS v4 (`@tailwindcss/vite` 플러그인 방식)
- Tiptap v3 (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`)
- Dexie v4 + `dexie-react-hooks`
- Gemini API (`gemini-2.0-flash`)

## 폴더 구조
```
src/
├── components/   # UI 컴포넌트
├── db/           # Dexie DB 정의 및 쿼리
└── hooks/        # 커스텀 훅
```

## Gemini API 규칙
- API 키는 반드시 `import.meta.env.VITE_GEMINI_API_KEY`로만 접근
- 모델은 `gemini-2.0-flash`로 고정

## 금지사항
- `tailwind.config.js` 생성 금지 — v4는 설정 파일 불필요
- `editor.getHTML()`을 AI에 직접 전송 금지 — 반드시 `editor.getText()` 사용
- Dexie에 `JSON.stringify` 중복 적용 금지 — 객체를 그대로 저장할 것

## onUpdate 규칙
- Tiptap `onUpdate` 콜백에서 AI 호출 시 반드시 **800ms 디바운스** 적용

## 코딩 규칙
- 컴포넌트는 함수형만 사용
- TypeScript 사용 안 함 (`.jsx`, `.js` 파일만)
- CSS는 Tailwind 클래스만 사용 (인라인 스타일, 별도 CSS 파일 작성 금지)
- 주석은 꼭 필요한 경우에만, 한국어로 작성
