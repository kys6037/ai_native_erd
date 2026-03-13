# Phase 04 — Versioning & Migration

## 목표
버전 스냅샷, diff 뷰어, 롤백, 마이그레이션 SQL 생성.

---

## 완료 조건

- [ ] 버전 생성 → 목록에서 확인
- [ ] 두 버전 diff 뷰어 동작
- [ ] diff에서 마이그레이션 SQL 생성 (FK 포함)
- [ ] 마이그레이션 SQL: FK DROP → 컬럼 수정 → FK ADD 순서
- [ ] 버전 롤백 → 캔버스에 즉시 반영
- [ ] 롤백 전 현재 상태 자동 스냅샷

---

## 마이그레이션 실행 순서

**반드시 이 순서를 지킨다. 어기면 CONSTRAINT 위반 발생:**

```
Step 1: 제거될 FK 제약 DROP
        + 수정되는 테이블의 기존 FK도 DROP (재생성 예정)
Step 2: 테이블 DROP
        (의존성 역순: 참조하는 테이블을 먼저 DROP)
Step 3: 테이블 CREATE
        (의존성 순서: 참조되는 테이블을 먼저 CREATE)
Step 4: 컬럼 ADD / MODIFY / DROP
Step 5: FK 제약 ADD
        (새 것 + 수정된 테이블의 FK 재추가)
```

---

## 백엔드 구현 항목

### VersionRepository
- `findAll(projectId)`: version_number 내림차순
- `findById(id)`: erd_data 포함
- `create(projectId, message, erdData, userId)`: version_number 자동 계산 (MAX + 1)
- `getNextVersionNumber(projectId)`

### VersionApi
- 스펙: `04-api-contract.md` 버전 관리 섹션
- restore 엔드포인트:
  1. 현재 상태를 "Auto-save before restore v{N}" 버전으로 저장
  2. project.erd_data를 해당 버전으로 업데이트
  3. 업데이트된 Project 반환

### SchemaDiffer
두 ErdData 비교 → SchemaDiff 생성:

```
테이블 매칭: 이름 기준 (ID가 아닌 이름)
컬럼 매칭: 이름 기준

변경 감지:
  addedTables    = to.tables 중 from에 없는 것
  removedTables  = from.tables 중 to에 없는 것
  modifiedTables = 이름이 같은데 컬럼이 다른 것

컬럼 변경 감지 항목: type, length, precision, scale,
                     nullable, primaryKey, autoIncrement, defaultValue

관계 매칭:
  constraintName 있으면 constraintName으로
  없으면 sourceTable.sourceCol → targetTable.targetCol 복합키로
```

### MigrationGenerator
위 순서대로 SQL 생성. 핵심 주의사항:

**Step 1 처리**:
- `diff.removedRelationships`의 constraintName이 있는 것
- **추가로**: `diff.modifiedTables`에 포함된 테이블의 기존 FK 전부 DROP (Step 5에서 재생성)

**Step 3 처리**:
- 추가될 테이블을 위상 정렬 (FK 참조 대상 테이블 먼저 CREATE)
- CREATE 시 FK 제약 없이 생성 (컬럼에 foreignKey 있어도 무시)

**Step 5 처리**:
- `diff.addedRelationships`
- `diff.addedTables`의 FK 컬럼들
- `diff.modifiedTables`에 포함된 테이블의 새 FK 전부 재추가

### MigrationApi
- 스펙: `04-api-contract.md` 마이그레이션 섹션

---

## 프론트엔드 구현 항목

### VersionModal
- 버전 목록 (번호, 메시지, 날짜)
- "Diff 보기" → DiffModal 열기
- "복원" → 확인 다이얼로그 → API 호출 → 상태 업데이트 + 히스토리 초기화

### DiffModal
색상 코딩:
- 추가: 초록색
- 제거: 빨간색
- 수정: 노란색 (before → after 표시)

"마이그레이션 SQL 생성" 버튼:
- dialect 선택
- API 호출 → SQL 코드 뷰어 표시
- 복사 버튼 + 파일 다운로드 버튼

### 상태 관리 추가
- `createVersion(message)`: API 호출 → toast
- `restoreVersion(versionId)`: API 호출 → 상태 교체 + 히스토리 초기화

---

## 테스트 항목

### 백엔드 (중요)
- `SchemaDifferTest`: 추가/제거/수정 diff 정확성
- `MigrationGeneratorTest`: FK 포함 시 순서 검증
  ```
  시나리오: FK 컬럼 타입 변경
  기대: DROP FK → ALTER COLUMN → ADD FK 순서
  ```
- 자기 참조 FK 테이블 마이그레이션
- 버전 롤백 후 version_number 연속성

### 프론트엔드
- Diff 렌더링: 추가/제거/수정 색상 정확성
- 롤백 후 히스토리 초기화 확인
