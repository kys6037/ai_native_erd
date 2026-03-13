# Feature: Version Control

## SchemaDiffer 명세

### 테이블 매칭 기준
- **이름** 기반 (ID가 아님)
- 이유: DDL 임포트, DB 임포트 시 ID가 달라질 수 있음

### 컬럼 변경 감지 항목
`type`, `length`, `precision`, `scale`, `nullable`, `primaryKey`, `autoIncrement`, `defaultValue`

컬럼 이름이 다르면 → 삭제 + 추가로 처리 (rename 미지원)

### 관계 매칭 기준
```
constraintName 있으면: constraintName으로 매칭
없으면: sourceTable.sourceColumn → targetTable.targetColumn 복합키로 매칭
```

---

## MigrationGenerator 명세

### 실행 순서 (절대 변경 금지)

```
Step 1: FK DROP
  - diff.removedRelationships 중 constraintName 있는 것
  - diff.modifiedTables에 포함된 테이블의 기존 FK 전부
    (이 테이블들의 FK는 Step 5에서 재생성)

Step 2: 테이블 DROP
  - diff.removedTables
  - 순서: 다른 테이블을 참조하는 테이블 먼저 (역위상 정렬)

Step 3: 테이블 CREATE
  - diff.addedTables
  - 순서: 참조되는 테이블 먼저 (위상 정렬)
  - FK 제약 없이 생성 (컬럼에 foreignKey 정보 있어도 무시)

Step 4: 컬럼 ALTER
  - diff.modifiedTables의 addedColumns, removedColumns, modifiedColumns
  - FK 없이 ALTER

Step 5: FK ADD
  - diff.addedRelationships
  - diff.addedTables의 FK 컬럼들
  - diff.modifiedTables의 FK 컬럼들 (모두 재추가)
```

### 순환 FK 처리 (MySQL)
```sql
SET FOREIGN_KEY_CHECKS = 0;
-- ... migration statements ...
SET FOREIGN_KEY_CHECKS = 1;
```
순환 참조가 감지되면 이 구문으로 감싼다.

---

## 버전 rollback 동작

```
1. POST /api/projects/:id/versions/:vId/restore
2. 서버: 현재 erd_data를 "Auto-save before restore v{N}" 버전으로 저장
3. 서버: project.erd_data = targetVersion.erd_data
4. 서버: 업데이트된 Project 반환
5. 클라이언트: ERD 상태 교체 + undo 히스토리 초기화
```

---

## Diff 시각화 규칙

| 변경 타입 | 색상 |
|----------|------|
| 추가된 테이블/컬럼/관계 | 초록색 |
| 제거된 테이블/컬럼/관계 | 빨간색 |
| 수정된 테이블 헤더 | 노란색 |
| 수정된 컬럼 값 | 노란색 + `before → after` |

---

## 에지 케이스

| 상황 | 처리 |
|------|------|
| from = to | 빈 diff, "변경사항 없음" 표시 |
| 자기 참조 FK | 동일한 Step 순서 적용 |
| 테이블 이름 변경 | 제거 + 추가로 처리, 데이터 손실 경고 주석 추가 |
| 복합 PK 변경 | PK DROP + 컬럼 수정 + PK ADD |
