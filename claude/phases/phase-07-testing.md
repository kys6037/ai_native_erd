# Phase 07 — Testing

## 목표
Phase 1–6에서 작성된 테스트를 점검하고, 누락된 케이스를 보완한다.

---

## 완료 조건

- [ ] 백엔드 테스트 전체 통과 (커버리지 70% 이상)
- [ ] 프론트엔드 테스트 전체 통과
- [ ] MigrationGenerator FK 순서 테스트 통과
- [ ] DDL 4가지 dialect 파라미터화 테스트 통과
- [ ] undo/redo 경계값 테스트 통과
- [ ] API 403 보안 테스트 전체 통과

---

## 테스트 원칙

1. **실제 SQLite 사용**: 인메모리 SQLite (`:memory:`) 를 사용한다. Mock DB 금지.
2. **격리**: 각 테스트는 독립적이다. `@BeforeEach`에서 데이터 초기화.
3. **경계값**: 히스토리 50개 제한, 빈 ERD, 단일 테이블 등
4. **보안**: 모든 API 엔드포인트에 403 케이스 테스트

---

## 백엔드 필수 테스트

### 인증
- 회원가입: 성공, 이메일 중복, 형식 오류, 필드 누락
- 로그인: 성공, 비밀번호 오류, 없는 이메일
- JWT: 생성, 검증, 만료, 위조된 토큰
- 미들웨어: 보호된 경로 토큰 없음 → 401

### 프로젝트
- CRUD 전체 흐름
- 403: 다른 사용자 프로젝트 GET/PUT/DELETE
- ERD 데이터 JSON 직렬화/역직렬화 정확성

### DDL 생성
```
각 dialect (mysql, postgresql, oracle, mssql)에 대해:
  - 기본 테이블 생성
  - PK + Auto Increment 컬럼
  - FK 제약
  - 인덱스 (일반, UNIQUE)
  - VARCHAR(n), DECIMAL(p,s) 등 타입별
```

### DDL 파서
- 일반적인 CREATE TABLE 구문
- FOREIGN KEY 절
- PRIMARY KEY 절 (인라인, 테이블 수준)
- 지원하지 않는 구문 → warnings에 추가, 나머지 계속 파싱

### SchemaDiffer
- 테이블 추가/제거 감지
- 컬럼 추가/제거/수정 감지
- 변경 없는 테이블은 modifiedTables에 포함되지 않음
- 관계 추가/제거 감지

### MigrationGenerator (가장 중요)
```
시나리오 1: FK 컬럼 타입 변경
  Before: orders.user_id INT FK→users.id (fk_orders_user_id)
  After:  orders.user_id BIGINT FK→users.id (fk_orders_user_id)

  기대 SQL 순서:
  1. ALTER TABLE orders DROP FOREIGN KEY fk_orders_user_id
  2. ALTER TABLE orders MODIFY COLUMN user_id BIGINT
  3. ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id ...

시나리오 2: 테이블 추가 (FK 포함)
  FK 참조 대상 테이블이 먼저 CREATE되어야 함

시나리오 3: 테이블 삭제 (다른 테이블에서 참조됨)
  참조하는 테이블의 FK를 먼저 DROP해야 함
```

### 버전
- version_number 단조 증가
- 롤백 전 자동 스냅샷 생성
- 롤백 후 erd_data 정확히 교체

### 데이터 사전
- upsert: 생성 → 수정 (중복 없이)
- 테이블 수준 항목 중복 방지
- 403: 다른 프로젝트 접근

---

## 프론트엔드 필수 테스트

### ERD 상태 관리
```
- addTable: 고유 ID 생성, columns 기본값
- updateColumn: 부분 업데이트
- deleteRelationship: 참조 정리
- undo: 이전 스냅샷으로 복원
- redo: undo 후 redo
- 히스토리 50개 초과 시 오래된 것 제거
- redo 가능한 상태에서 새 변경 → redo 스택 초기화
```

### 인증 흐름
```
- 로그인 성공 → 토큰 저장 → 대시보드 이동
- 로그인 실패 → 에러 메시지 표시
- 만료된 토큰으로 API 요청 → 로그아웃 + 로그인 이동
```

### 컴포넌트
- 대시보드: 프로젝트 목록 렌더링, 빈 상태
- DiffModal: 추가/제거/수정 색상 렌더링

---

## 테스트 환경 설정

### 백엔드
- DB: 인메모리 SQLite (`jdbc:sqlite::memory:`)
- 각 테스트 전 스키마 초기화
- 각 테스트 후 데이터 삭제 (`@AfterEach`)

### 프론트엔드
- MSW (Mock Service Worker)로 API 응답 모킹
- 각 테스트 전 스토어 초기 상태 리셋
