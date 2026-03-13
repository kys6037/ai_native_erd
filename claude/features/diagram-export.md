# Feature: Diagram Export

## PNG 내보내기

라이브러리: `html2canvas`

동작:
1. 캔버스 DOM 요소 선택
2. 미니맵/컨트롤 UI 임시 숨기기
3. html2canvas로 캡처 (scale: 2, 배경색 테마에 맞게)
4. PNG 파일 다운로드
5. UI 복원

파일명: `{프로젝트이름}.png`  (특수문자 → `_` 대체)

---

## PDF 내보내기

라이브러리: `html2canvas` + `jsPDF`

동작:
1. html2canvas로 캡처 (scale: 1.5)
2. 이미지 크기에 맞게 PDF 페이지 생성
   - 가로 > 세로: landscape
   - 그 외: portrait
3. PDF에 이미지 삽입
4. PDF 파일 다운로드

파일명: `{프로젝트이름}.pdf`

---

## 공통 주의사항

- 내보내기 중 로딩 상태 표시
- 성공 후 toast
- 실패 시 toast + 콘솔 에러
- 테이블 없을 때: "내보낼 내용이 없습니다" 안내
- 매우 큰 ERD (100+ 테이블): scale 낮춰서 처리

---

## DDL 내보내기

- `POST /api/ddl/generate` 호출
- 응답 SQL을 텍스트 파일로 다운로드
- 파일명: `{프로젝트이름}_{dialect}.sql`
