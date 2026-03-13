# Feature: DDL Generation & Import

## DDL Dialect 규칙

### 식별자 따옴표
| Dialect | 따옴표 |
|---------|--------|
| MySQL | `` ` `` |
| PostgreSQL | `"` |
| Oracle | 없음 (대문자 변환) |
| MSSQL | `[]` |

### Auto Increment
| Dialect | 표현 |
|---------|------|
| MySQL | `AUTO_INCREMENT` |
| PostgreSQL | `SERIAL` / `BIGSERIAL` |
| Oracle | 별도 시퀀스 또는 생략 |
| MSSQL | `IDENTITY(1,1)` |

### 타입 변환
| 공통 타입 | MySQL | PostgreSQL | Oracle | MSSQL |
|---------|-------|------------|--------|-------|
| BOOLEAN | TINYINT(1) | BOOLEAN | NUMBER(1) | BIT |
| BLOB | LONGBLOB | BYTEA | BLOB | VARBINARY(MAX) |
| VARCHAR(n) | VARCHAR(n) | VARCHAR(n) | VARCHAR2(n) | NVARCHAR(n) |
| TEXT | TEXT | TEXT | CLOB | NVARCHAR(MAX) |

### 문장 구분자
| Dialect | 구분자 |
|---------|--------|
| MySQL, PostgreSQL | `;` |
| Oracle | `/` |
| MSSQL | `GO` |

### DROP 방식
| Dialect | 구문 |
|---------|------|
| MySQL | `DROP TABLE IF EXISTS` |
| PostgreSQL | `DROP TABLE IF EXISTS ... CASCADE` |
| Oracle | `DROP TABLE ... CASCADE CONSTRAINTS` |
| MSSQL | `IF OBJECT_ID('table') IS NOT NULL DROP TABLE` |

---

## DDL 파서 명세

### 지원 구문
```sql
CREATE TABLE [IF NOT EXISTS] table_name (
  col_name  TYPE [(size)] [NOT NULL] [DEFAULT val] [PRIMARY KEY] [AUTO_INCREMENT],
  ...
  [CONSTRAINT name] PRIMARY KEY (col1, col2),
  [CONSTRAINT name] FOREIGN KEY (col) REFERENCES other_table(col) [ON DELETE action],
  UNIQUE (col1, col2)
);
```

### 파싱 전략
1. `CREATE TABLE` 블록 분리 (중첩 괄호 처리)
2. 각 컬럼 정의 라인 분리
3. 테이블 제약 (`PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`) 처리
4. 파싱 실패한 라인: warnings에 추가, 나머지 계속

### 반환값
```
{
  erdData: ErdData,
  warnings: string[]
}
```

---

## DB 임포트 명세

### JDBC URL 패턴
```
MySQL:      jdbc:mysql://host:3306/database?useSSL=false&serverTimezone=UTC
PostgreSQL: jdbc:postgresql://host:5432/database
Oracle:     jdbc:oracle:thin:@host:1521/service
MSSQL:      jdbc:sqlserver://host:1433;database=name
SQLite:     jdbc:sqlite:/path/to/file
```

### 스키마 추출 (DatabaseMetaData API)
```
getTables()     → 테이블 목록
getColumns()    → 컬럼 정의 (타입, 크기, nullable, 기본값)
getPrimaryKeys() → PK 컬럼
getImportedKeys() → FK 정보 (참조 테이블/컬럼, 제약 이름)
getIndexInfo()   → 인덱스 (이름, 컬럼, unique 여부)
                   PRIMARY 인덱스는 제외
```

### ErdData 변환
1. 각 테이블 → ErdTable (UUID 할당)
2. FK 정보 → ErdRelationship (테이블 이름 → UUID 매핑)
3. 자동 레이아웃 적용

### 임포트 병합 모드
- **교체**: 현재 ERD를 임포트 데이터로 완전 교체
- **병합**:
  - 이름이 같은 테이블: 컬럼 업데이트, 위치 유지
  - 새 테이블: 추가
  - 기존 관계와 중복되는 관계: 건너뜀 (constraintName 기준)
