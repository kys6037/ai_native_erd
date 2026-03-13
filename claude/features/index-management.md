# Feature: Index Management

## 저장 방식

별도 DB 테이블 없음. `ErdTable.indexes` 필드에 저장 → `projects.erd_data` JSON에 포함.
변경 → Ctrl+S 또는 자동 저장으로 서버에 반영.

---

## 인덱스 유효성 규칙

- 이름: 비어있으면 안 됨
- 컬럼: 최소 1개 이상 선택
- 같은 테이블 내 이름 중복 없음 (DDL 생성 시 오류 방지)

---

## DDL 생성 포함 여부

`generate(erdData)` 호출 시 인덱스도 포함:
```
CREATE TABLE 생성 후에 CREATE INDEX 구문 추가
(FK 제약과 동일한 위치 또는 이후)
```

---

## UI: Indexes 탭 (TableEditor 내)

각 인덱스 행:
- 이름 입력
- 컬럼 선택 (현재 테이블 컬럼 토글 버튼)
- UNIQUE 체크박스
- 삭제 버튼

추가 버튼: 기본값으로 새 항목 추가

---

## DB 임포트 시 인덱스

`DatabaseMetaData.getIndexInfo()` 결과:
- `NON_UNIQUE = false` → unique 인덱스
- PRIMARY 이름 인덱스는 제외
- 복합 인덱스: 같은 이름의 여러 행 → 컬럼 순서대로 합침
