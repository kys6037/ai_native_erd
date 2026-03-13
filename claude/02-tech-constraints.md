# 02 — Tech Constraints & Guidelines

## 고정 제약 (변경 불가)

| 항목 | 제약 |
|------|------|
| 백엔드 런타임 | JVM (Java, Kotlin, Groovy, Scala 중 선택) |
| 임베디드 DB | SQLite |
| 협업 프로토콜 | WebSocket |
| 협업 동기화 | CRDT 기반 (Yjs 권장) |
| 빌드 결과 | 단일 JAR 또는 컨테이너 이미지 |
| 인증 방식 | 무상태 토큰 (JWT 권장) |

---

## 선택 가이드라인

### 백엔드 언어 선택

JVM 계열이면 자유롭게 선택. 선택 기준 제안:

| 선택지 | 적합한 경우 |
|--------|-------------|
| **Kotlin** | 간결한 코드 선호, 새 프로젝트 |
| **Java** | 팀이 Java에 익숙, 안정성 우선 |
| **Groovy** | 스크립팅 스타일 선호 |
| **Scala** | 함수형 패러다임 선호 |

### 백엔드 프레임워크

가벼운 HTTP 서버면 충분하다. 선택 기준 제안:

| 선택지 | 적합한 경우 |
|--------|-------------|
| **Javalin** | 단순한 REST API, Kotlin/Java |
| **Ktor** | Kotlin 네이티브, 코루틴 선호 |
| **Spring Boot** | 복잡한 요구사항, 팀이 Spring 익숙 |
| **Micronaut** | 빠른 시작 시간 중요 |
| **Quarkus** | GraalVM 네이티브 빌드 필요 |

> 단순한 REST API + WebSocket이므로 경량 프레임워크가 적합하다.

### 프론트엔드 (완전 자유)

제약 없음. 팀 역량과 요구사항에 맞게 선택:

| 선택지 | 특징 |
|--------|------|
| **React** | 생태계 최대, ERD 라이브러리 풍부 |
| **Vue** | 학습 곡선 낮음 |
| **Svelte** | 번들 크기 최소 |
| **SolidJS** | 고성능 반응성 |
| **Angular** | 엔터프라이즈 선호 |

ERD 캔버스 라이브러리:
- **ReactFlow** — React 전용, 성숙한 생태계
- **X6** — 프레임워크 무관, 기능 풍부
- **D3** — 자유도 최대, 구현 비용 높음
- **Cytoscape.js** — 그래프 특화

### 상태 관리 (FE)

| 선택지 | 적합한 경우 |
|--------|-------------|
| **Zustand** | React, 단순한 전역 상태 |
| **Pinia** | Vue |
| **Redux Toolkit** | 복잡한 상태, 팀이 Redux 익숙 |
| **Jotai/Recoil** | 원자 단위 상태 |
| **내장 reactivity** | Svelte, SolidJS |

### 빌드 도구 (FE)

| 선택지 | 적합한 경우 |
|--------|-------------|
| **Vite** | 빠른 개발 경험, 대부분 경우 |
| **esbuild** | 최소 설정 |
| **Webpack** | 레거시 호환 필요 |

---

## 아키텍처 원칙

### 백엔드
- **수동 DI 또는 경량 DI** — Spring의 전체 IoC 컨테이너는 이 프로젝트에 과잉
- **Repository 패턴** — DB 접근을 비즈니스 로직에서 분리
- **단일 SQLite 풀** — SQLite는 단일 writer이므로 연결 풀 크기 = 1 또는 WAL 모드
- **모든 쿼리에 바인딩 파라미터** — SQL Injection 방지
- **비밀번호는 단방향 해시** — bcrypt/argon2

### 프론트엔드
- **단일 API 클라이언트** — 중앙화된 HTTP 클라이언트, 인증 헤더 자동 첨부
- **단일 상태 소스** — ERD 데이터는 한 곳에서 관리
- **낙관적 업데이트 주의** — 저장 실패 시 롤백 처리 필수

### 공통
- **날짜/시간** — UTC 저장, ISO 8601 형식
- **ID** — DB 자동 증가 정수 (UUID는 이 규모에서 과잉)
- **에러 응답** — 일관된 형식: `{ "error": "메시지" }`

---

## 프로젝트 구조 가이드라인

디렉토리 구조는 선택한 프레임워크의 관례를 따른다.
**아래는 예시이지, 강제 사항이 아니다.**

```
my-erd-app/
├── backend/              # 또는 server/, api/ 등
│   ├── src/
│   └── build 파일
├── frontend/             # 또는 client/, web/ 등
│   ├── src/
│   └── package.json
├── claude/               # 이 파일들
└── .env
```

백엔드 내부 구조도 선택한 언어/프레임워크 관례를 따른다.
계층은 `api → service → repository → db` 방향으로 의존성이 흐르면 충분하다.

---

## 환경 변수 (최소 필요)

```
JWT_SECRET        # 인증 시크릿 (최소 32자)
DB_PATH           # SQLite 파일 경로 (기본: ./erd.db)
PORT              # 서버 포트 (기본: 8080)
```

---

## decisions/ 폴더 사용법

프로젝트 시작 전에 `decisions/stack.md`를 작성한다:

```markdown
# Stack Decision

## Backend
- Language: Kotlin
- Framework: Javalin
- 이유: ...

## Frontend
- Framework: React + Vite
- 상태관리: Zustand
- 캔버스: ReactFlow
- 이유: ...
```

결정 후에는 이 파일을 참조하여 일관성을 유지한다.
