# 04 — API Contract

## 공통 규칙

**Base URL**: `/api`

**인증**: `Authorization: Bearer <token>` 헤더
- `/api/auth/*` 제외한 모든 경로에 필요
- 토큰 없음/무효: `401 { "error": "..." }`

**에러 응답 형식** (모든 4xx/5xx):
```json
{ "error": "설명 메시지" }
```

**날짜 형식**: ISO 8601 UTC (`2024-01-15T10:30:00Z`)

---

## 인증

### POST /api/auth/register
```
Request:
  email:    string (필수, 이메일 형식)
  password: string (필수)
  name:     string (필수)

Response 201:
  token: string
  user:  { id, email, name, createdAt }

Error:
  400 — 유효성 실패 (형식, 누락 필드)
  400 — "Email already exists"
```

### POST /api/auth/login
```
Request:
  email:    string
  password: string

Response 200:
  token: string
  user:  { id, email, name, createdAt }

Error:
  401 — "Invalid credentials"
```

---

## 프로젝트

### GET /api/projects
```
Response 200: Project[]
  (erd_data 제외, 목록용)
```

### POST /api/projects
```
Request:
  name:        string (필수)
  description: string?

Response 201: Project (erd_data 포함)
Error: 400 — name 누락
```

### GET /api/projects/:id
```
Response 200: Project (erd_data 포함)
Error: 404, 403
```

### PUT /api/projects/:id
```
Request (모두 선택적):
  name:        string?
  description: string?
  erdData:     ErdData?

Response 200: Project
Error: 403, 404
```

### DELETE /api/projects/:id
```
Response 204
Error: 403, 404
```

---

## 버전 관리

### GET /api/projects/:id/versions
```
Response 200: Version[] (version_number 내림차순)
```

### POST /api/projects/:id/versions
```
Request:
  message: string (필수)

Response 201: Version
```

### GET /api/projects/:id/versions/:versionId
```
Response 200: Version (erd_data 포함)
Error: 404
```

### POST /api/projects/:id/versions/:versionId/restore
```
동작:
  1. 현재 상태를 "Auto-save before restore" 버전으로 자동 저장
  2. project.erd_data를 해당 버전으로 교체

Response 200: Project (업데이트된)
Error: 404
```

---

## 마이그레이션

### POST /api/migration/generate
```
Request:
  fromVersionId: integer
  toVersionId:   integer
  dialect:       string [mysql|postgresql|oracle|mssql]

Response 200:
  sql:  string
  diff: SchemaDiff

Error: 404 (버전 없음), 403 (접근 권한 없음)
```

---

## DDL

### POST /api/ddl/generate
```
Request:
  erdData: ErdData
  dialect: string [mysql|postgresql|oracle|mssql]

Response 200:
  sql: string
```

### POST /api/ddl/parse
```
Request:
  sql:     string
  dialect: string

Response 200:
  erdData:  ErdData
  warnings: string[]

Error: 400 — 파싱 불가
```

---

## DB 연결

### GET /api/connections
```
Response 200: DbConnection[] (password 필드 null로 마스킹)
```

### POST /api/connections
```
Request: DbConnection 필드들 (password 포함)
Response 201: DbConnection (password null)
```

### PUT /api/connections/:id
```
Request: DbConnection 필드들 (부분 업데이트)
Response 200: DbConnection
Error: 403, 404
```

### DELETE /api/connections/:id
```
Response 204
```

### POST /api/connections/:id/test
```
Response 200: { success: true }
Error: 400 — { error: "Connection failed: ..." }
```

### GET /api/connections/:id/schemas
```
Response 200: string[] (스키마/데이터베이스 이름 목록)
```

### POST /api/connections/:id/import
```
Request:
  schemaName:  string
  tableNames:  string[]? (null이면 전체)

Response 200: ErdData (임포트된 데이터, 자동 레이아웃 적용)
```

---

## 데이터 사전

### GET /api/projects/:id/dictionary
```
Query: tableName=string (선택적 필터)
Response 200: DictionaryEntry[]
```

### POST /api/projects/:id/dictionary
```
Request: DictionaryEntry 필드들
동작: upsert (UNIQUE 제약 기반)

Response 200: DictionaryEntry
```

### DELETE /api/projects/:id/dictionary/:entryId
```
Response 204
Error: 404
```

---

## WebSocket

### ws://host/ws/collab/:projectId

**연결 후 인증 흐름**:
```
클라이언트 → 서버: { "type": "auth", "token": "..." }
서버 → 클라이언트: { "type": "auth_ok" }
   또는: { "type": "auth_fail" } (연결 종료)
서버 → 클라이언트: <현재 Yjs 상태 바이너리>
```

**업데이트 흐름**:
```
클라이언트 → 서버: <Yjs update 바이너리>
서버 → 다른 클라이언트들: <동일 바이너리 브로드캐스트>
```

**메타 이벤트** (JSON 텍스트):
```json
{ "type": "user_joined", "userId": 1, "userName": "Alice" }
{ "type": "user_left", "userId": 1 }
{ "type": "pong" }
```

**오류**:
- 인증 실패 → 연결 종료
- 접근 권한 없음 → 연결 종료

---

## DDL Dialect 차이

| 기능 | MySQL | PostgreSQL | Oracle | MSSQL |
|------|-------|------------|--------|-------|
| 식별자 따옴표 | 백틱 | 쌍따옴표 | 없음(대문자) | 대괄호 |
| Auto Increment | AUTO_INCREMENT | SERIAL | 시퀀스/IDENTITY | IDENTITY(1,1) |
| 문장 구분자 | `;` | `;` | `/` | `GO` |
| 문자열 | VARCHAR | VARCHAR | VARCHAR2 | NVARCHAR |
| 이진 | LONGBLOB | BYTEA | BLOB | VARBINARY(MAX) |
| 불린 | TINYINT(1) | BOOLEAN | NUMBER(1) | BIT |

**DDL 생성 순서** (FK 순환 참조 방지):
1. 모든 테이블 CREATE (FK 제약 없이)
2. FK ALTER TABLE ADD CONSTRAINT
3. CREATE INDEX

**마이그레이션 SQL 실행 순서** (CONSTRAINT 위반 방지):
1. FK 제약 DROP
2. 테이블 DROP
3. 테이블 CREATE
4. 컬럼 ALTER
5. FK 제약 ADD
