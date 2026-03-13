# 03 — Domain Models

언어 무관 도메인 모델 정의. 구현 시 선택한 언어의 타입 시스템으로 표현한다.

---

## 핵심 도메인

### User
```
User
  id:         integer (PK, auto-increment)
  email:      string (unique)
  password:   string (해시)
  name:       string
  created_at: datetime
```

### Project
```
Project
  id:          integer (PK)
  user_id:     integer (FK → User)
  name:        string
  description: string?
  erd_data:    json (ErdData 직렬화)
  created_at:  datetime
  updated_at:  datetime
```

### Version
```
Version
  id:             integer (PK)
  project_id:     integer (FK → Project)
  version_number: integer (단조 증가, 프로젝트 내 고유)
  message:        string
  erd_data:       json (스냅샷)
  created_by:     integer (FK → User)
  created_at:     datetime
```

### DbConnection
```
DbConnection
  id:       integer (PK)
  user_id:  integer (FK → User)
  name:     string
  type:     enum [mysql, postgresql, oracle, mssql, sqlite]
  host:     string?
  port:     integer?
  database: string?
  username: string?
  password: string? (암호화 저장)
  ssl:      boolean
```

### DictionaryEntry
```
DictionaryEntry
  id:            integer (PK)
  project_id:    integer (FK → Project)
  table_name:    string
  column_name:   string?  (null이면 테이블 수준 설명)
  description:   string?
  data_standard: string?
  domain:        string?
  example:       string?
  updated_at:    datetime

  UNIQUE(project_id, table_name, column_name)
```

---

## ERD 데이터 구조 (ErdData)

JSON으로 직렬화되어 `Project.erd_data`와 `Version.erd_data`에 저장된다.

```
ErdData
  tables:        ErdTable[]
  relationships: ErdRelationship[]
```

### ErdTable
```
ErdTable
  id:      string (UUID)
  name:    string
  schema:  string?
  columns: ColumnMetadata[]
  indexes: IndexMetadata[]
  x:       number  (캔버스 위치)
  y:       number
  color:   string  (HEX, 시각적 구분용)
```

### ColumnMetadata
```
ColumnMetadata
  name:          string
  type:          string         예: "INT", "VARCHAR", "TEXT"
  length:        integer?       예: VARCHAR(255) → 255
  precision:     integer?       예: DECIMAL(10,2) → 10
  scale:         integer?       예: DECIMAL(10,2) → 2
  nullable:      boolean
  primaryKey:    boolean
  autoIncrement: boolean
  defaultValue:  string?
  comment:       string?
  foreignKey:    ForeignKeyRef?
```

### ForeignKeyRef
```
ForeignKeyRef
  referencedTable:  string
  referencedColumn: string
  constraintName:   string?
```

### ErdRelationship
```
ErdRelationship
  id:               string (UUID)
  sourceTableId:    string
  sourceColumnName: string
  targetTableId:    string
  targetColumnName: string
  type:             enum [one-to-one, one-to-many, many-to-many]
  constraintName:   string?
```

### IndexMetadata
```
IndexMetadata
  name:    string
  columns: string[]  (컬럼 이름 목록, 순서 중요)
  unique:  boolean
```

---

## Diff 모델 (버전 비교용)

```
SchemaDiff
  addedTables:         ErdTable[]
  removedTables:       ErdTable[]
  modifiedTables:      TableDiff[]
  addedRelationships:  ErdRelationship[]
  removedRelationships: ErdRelationship[]

TableDiff
  tableId:         string
  tableName:       string
  addedColumns:    ColumnMetadata[]
  removedColumns:  ColumnMetadata[]
  modifiedColumns: ColumnDiff[]

ColumnDiff
  columnName: string
  before:     ColumnMetadata
  after:      ColumnMetadata
```

---

## 비즈니스 규칙

- 프로젝트는 소유자(`user_id`)만 수정/삭제 가능
- `version_number`는 프로젝트 내에서 단조 증가 (재사용 없음)
- 테이블 `id`는 UUID, 관계 연결에 사용 (이름이 바뀌어도 유지됨)
- 자기 참조 FK 허용 (source/target이 같은 테이블)
- `column_name`이 null인 `DictionaryEntry`는 테이블 수준 설명 (프로젝트당 테이블당 1개)

---

## SQLite DDL

```sql
CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    erd_data    TEXT NOT NULL DEFAULT '{"tables":[],"relationships":[]}',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS versions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id     INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    message        TEXT NOT NULL,
    erd_data       TEXT NOT NULL,
    created_by     INTEGER NOT NULL REFERENCES users(id),
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, version_number)
);

CREATE TABLE IF NOT EXISTS db_connections (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name     TEXT NOT NULL,
    type     TEXT NOT NULL,
    host     TEXT,
    port     INTEGER,
    database TEXT,
    username TEXT,
    password TEXT,
    ssl      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dictionary (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id    INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    table_name    TEXT NOT NULL,
    column_name   TEXT,
    description   TEXT,
    data_standard TEXT,
    domain        TEXT,
    example       TEXT,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, table_name, column_name)
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_versions_project ON versions(project_id);
CREATE INDEX IF NOT EXISTS idx_dictionary_project ON dictionary(project_id);
```
