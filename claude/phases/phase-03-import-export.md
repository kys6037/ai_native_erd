# Phase 03 — Import & Export

## 목표
DDL 생성, SQL 파싱, 외부 DB 임포트, PNG/PDF 내보내기.

---

## 완료 조건

- [ ] 4가지 dialect DDL 생성 (테이블 + FK + 인덱스 포함)
- [ ] DDL SQL 텍스트 → ERD 임포트
- [ ] `.sql` 파일 업로드 → ERD 임포트
- [ ] 외부 DB 연결 테스트
- [ ] 외부 DB 스키마 → ERD 임포트
- [ ] PNG 내보내기 (2x 해상도)
- [ ] PDF 내보내기
- [ ] 10MB 초과 파일 거부
- [ ] 임포트 경고 메시지 표시

---

## 백엔드 구현 항목

### DDL 생성기 (`ddl/` 패키지)

인터페이스:
```
DdlGenerator
  generate(erdData): string
  generateTable(table): string         // FK 제약 없이
  generateAddForeignKey(table, col): string
  generateDropForeignKey(tableName, constraintName): string
  generateIndexes(table): string
  generateAlterAdd(tableName, col): string
  generateAlterDrop(tableName, colName): string
  generateAlterModify(tableName, col): string
  generateDropTable(tableName): string
  columnType(col): string              // dialect별 타입 변환
```

4가지 구현체: MySQL, PostgreSQL, Oracle, MSSQL
팩토리: 문자열 → 구현체 반환

**생성 순서** (FK 순환 참조 방지):
1. 모든 테이블 CREATE (FK 없이)
2. FK ALTER TABLE ADD CONSTRAINT
3. CREATE INDEX

**Dialect별 주요 차이**: `04-api-contract.md` 참조

### DDL 파서

정규식 기반 `CREATE TABLE` 파서:
- 지원: `CREATE TABLE`, 컬럼 정의, `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`
- 파싱 실패/미지원 구문: warnings에 누적, 나머지는 계속 진행
- 반환: `{ erdData, warnings }`

### 외부 DB 연결 (`db/` 패키지)

JDBC 드라이버 (런타임 의존성):
- MySQL, PostgreSQL, Oracle, MSSQL, SQLite

MetadataExtractor:
- `testConnection(config)`: 연결 가능 여부 확인
- `listSchemas(config)`: 스키마/데이터베이스 목록
- `extractSchema(config, schemaName, tableNames?)`: 스키마 추출
  - DatabaseMetaData API로 컬럼, PK, FK, 인덱스 추출
  - 반환 데이터를 ErdData로 변환 (자동 레이아웃 적용)

연결 비밀번호: AES-256 암호화 저장

ConnectionRepository + ConnectionApi: `04-api-contract.md` 스펙

---

## 프론트엔드 구현 항목

### ImportModal (탭 3개)

**탭 1: DDL 텍스트**
- 텍스트 영역 + dialect 선택
- Parse 버튼 → API 호출 → 결과 미리보기
- 경고 있으면 toast로 표시
- "교체" vs "병합" 선택 후 적용

**탭 2: 파일 업로드**
- 드래그&드롭 영역
- 10MB 초과 거부
- 파일 읽기 → 탭 1과 동일 흐름으로 처리

**탭 3: DB 연결**
1. 저장된 연결 목록
2. 연결 선택 → 스키마 목록 로드
3. 스키마 선택 → 테이블 목록 (체크박스)
4. Import 버튼 → API 호출 → ERD에 적용

**병합 로직**:
- "교체": 현재 ERD를 임포트 데이터로 완전 교체
- "병합": 동일 이름 테이블 업데이트 + 새 테이블 추가 + 위치 보존

### ExportModal
- DDL: 텍스트 파일 다운로드 (`project-name_dialect.sql`)
- PNG: html2canvas → 2x 해상도 → 다운로드
- PDF: html2canvas → jsPDF → 다운로드
- 내보내기 중 로딩 상태
- 미니맵/컨트롤 UI 숨기고 캡처

### ConnectionManager (모달 또는 설정 페이지)
- 연결 CRUD
- 연결 테스트 버튼

---

## 테스트 항목

### 백엔드
- DDL 생성: 4가지 dialect 각각 테이블 + FK + 인덱스 검증
- DDL 파서: 일반적인 CREATE TABLE 구문들
- MetadataExtractor: 인메모리 SQLite로 스키마 추출 테스트
- 10MB 초과 파일 거부

### 프론트엔드
- DDL 붙여넣기 → 파싱 → ERD 반영
- 병합 모드: 기존 테이블 위치 보존 확인
