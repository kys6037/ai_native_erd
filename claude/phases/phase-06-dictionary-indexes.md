# Phase 06 — Data Dictionary & Index Management

## 목표
데이터 사전과 인덱스 관리. 둘 다 ERD 데이터의 일부로 저장된다.

---

## 완료 조건

- [ ] 데이터 사전 모달: 테이블 선택 → 설명 저장 → 재열기 시 로드
- [ ] 컬럼별 설명/표준/도메인/예시 저장
- [ ] 인덱스 추가/수정/삭제 (테이블 편집기 내)
- [ ] UNIQUE 인덱스 설정
- [ ] DDL 생성 시 인덱스 포함
- [ ] DB 임포트 시 인덱스 정보 보존

---

## 백엔드 구현 항목

### DictionaryRepository
- `findAll(projectId, tableName?)`: tableName 필터 선택적
- `upsert(entry)`: INSERT OR REPLACE (SQLite UNIQUE 제약 기반)
  - `column_name = NULL`인 경우 (테이블 수준): SQLite가 NULL을 UNIQUE에서 별도 처리하므로
    애플리케이션 레벨에서 기존 항목 조회 후 UPDATE 처리
- `delete(id, projectId)`: projectId 확인으로 타 프로젝트 접근 방지
- `findByTableAndColumn(projectId, tableName, columnName)`

### DictionaryApi
- 스펙: `04-api-contract.md` 데이터 사전 섹션

### 인덱스 관리
별도 테이블 없음. `ErdTable.indexes` 필드에 저장 → `projects.erd_data` JSON에 포함.

DDL 생성기에 `generateIndexes(table)` 추가:
```
MySQL:      CREATE [UNIQUE] INDEX `name` ON `table` (`col1`, `col2`);
PostgreSQL: CREATE [UNIQUE] INDEX "name" ON "table" ("col1", "col2");
Oracle:     CREATE [UNIQUE] INDEX NAME ON TABLE (COL1, COL2);
MSSQL:      CREATE [UNIQUE] INDEX [name] ON [table] ([col1], [col2]);
```

---

## 프론트엔드 구현 항목

### DictionaryModal

구조:
1. 테이블 선택 드롭다운 (현재 ERD 테이블 목록)
2. 테이블 수준 설명 폼
3. 컬럼별 설명 폼 목록

동작:
- 테이블 변경 → API로 해당 테이블 항목 로드
- 각 폼: 변경 감지 → Save 버튼 표시 → 클릭 시 upsert API 호출

빈 항목: null 값은 표시하지 않고 편집 가능한 빈 입력만 표시

### TableEditor — Indexes 탭

인덱스 항목:
- 이름 입력
- 컬럼 선택 (토글 버튼 방식 권장, 현재 테이블 컬럼 목록)
- UNIQUE 체크박스
- 삭제 버튼

유효성:
- 이름 비어있으면 저장 불가 (인라인 경고)
- 컬럼 0개 선택이면 저장 불가

변경 → ERD 상태 즉시 업데이트 (Ctrl+S로 서버에 저장)

---

## 테스트 항목

### 백엔드
- DictionaryRepository upsert: 생성, 수정, 테이블 수준 중복 방지
- DictionaryApi: CRUD + 403
- DDL 생성: 인덱스 포함 여부 검증

### 프론트엔드
- 항목 저장 → 재열기 시 동일 값 로드
- 인덱스 추가 → DDL 생성 결과에 CREATE INDEX 포함
