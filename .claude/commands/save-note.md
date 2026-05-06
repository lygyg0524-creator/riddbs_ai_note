현재 에디터 내용을 Dexie notes 테이블에 저장하는 함수를 만들어줘. 저장 시 editor.getJSON()을 JSON.stringify 없이 객체 그대로 저장. 복원 시 editor.setContent(note.content)로 객체 그대로 전달.
