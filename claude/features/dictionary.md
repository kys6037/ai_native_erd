# Feature: Data Dictionary

## 저장 구조

별도 테이블 (`dictionary`). `03-domain-models.md` 참조.

UNIQUE(project_id, table_name, column_name):
- `column_name = NULL`: 테이블 수준 설명
- SQLite에서 NULL은 UNIQUE에서 별도로 취급 → 애플리케이션에서 중복 방지 처리

---

## Upsert 동작

```
column_name가 null인 경우:
  기존 항목 조회 (project_id + table_name + column_name IS NULL)
  있으면 UPDATE, 없으면 INSERT

column_name이 있는 경우:
  INSERT OR REPLACE (UNIQUE 제약 기반)
```

---

## UI 동작

1. 테이블 선택 드롭다운 (현재 ERD 테이블 목록)
2. 선택 변경 → API 호출로 해당 테이블 항목 로드
3. 테이블 수준 폼: description, data_standard, domain
4. 컬럼별 폼: description, data_standard, domain, example
5. 값 변경 → "Save" 버튼 활성화
6. Save 클릭 → upsert API 호출

---

## 에지 케이스

| 상황 | 처리 |
|------|------|
| 테이블 삭제 | CASCADE로 사전 항목 자동 삭제 |
| 테이블 이름 변경 | 사전 항목의 table_name도 업데이트 필요 |
| ERD에 없는 테이블의 항목 | 사전 모달에서 표시하지 않음 |
