# Phase 01 — Foundation

## 목표
프로젝트 골격을 만든다. 이후 모든 phase의 기반이 되는 것들만 포함한다.

---

## 완료 조건

- [ ] 백엔드 서버 실행 (`PORT` 환경 변수로 포트 설정)
- [ ] SQLite DB 초기화 (`03-domain-models.md`의 DDL 전체 실행)
- [ ] `POST /api/auth/register` → 201 + 토큰
- [ ] `POST /api/auth/login` → 200 + 토큰
- [ ] 잘못된 토큰으로 보호된 경로 접근 → 401
- [ ] 프론트엔드 로그인 폼 → 성공 시 대시보드 이동
- [ ] 로그아웃 → 로그인 페이지 이동, 보호된 경로 차단
- [ ] 다크/라이트 테마 토글 (localStorage 저장)
- [ ] `./gradlew test` (또는 빌드 도구 test 명령) 통과

---

## 백엔드 구현 항목

### 1. 프로젝트 설정
- 선택한 언어/프레임워크로 HTTP 서버 설정
- SQLite JDBC 연결 풀 설정
  - WAL 모드 활성화: `PRAGMA journal_mode=WAL`
  - FK 활성화: `PRAGMA foreign_keys=ON`
  - SQLite는 단일 writer이므로 pool size = 1 권장
- `schema.sql` 읽어서 실행하는 초기화 로직
  - `schema_version` 테이블로 이미 실행됐는지 확인

### 2. 인증
- 비밀번호 해시: bcrypt (cost factor ≥ 10)
- JWT 생성/검증 (만료: 7일)
- 미들웨어/인터셉터: `/api/auth/*` 제외 모든 `/api/*` 경로 보호
  - 검증 성공: request context에 `userId` 저장
  - 검증 실패: 401

### 3. AuthApi
- `POST /api/auth/register`: 이메일 중복 확인 → 해시 → 저장 → JWT
- `POST /api/auth/login`: 조회 → bcrypt 검증 → JWT

### 4. 글로벌 에러 핸들러
- 모든 예외를 `{ "error": "..." }` 형식으로 응답
- 500 에러: 스택 트레이스 서버 로그에만 출력 (응답에 포함 금지)

---

## 프론트엔드 구현 항목

### 1. 프로젝트 설정
- 선택한 프레임워크/빌드 도구 설정
- API 클라이언트 설정:
  - Base URL 환경 변수
  - 요청 인터셉터: Authorization 헤더 자동 첨부
  - 응답 인터셉터: 401 → 로그아웃 + 로그인 페이지 이동

### 2. 인증 상태 관리
- 토큰과 사용자 정보를 영구 저장소(localStorage 등)에 유지
- 앱 시작 시 저장된 토큰 복원
- 로그아웃 시 저장소 완전 초기화

### 3. 라우팅
- `/login`, `/register`, `/`, `/project/:id` 경로 설정
- 보호된 라우트: 토큰 없으면 `/login`으로 redirect

### 4. LoginPage / RegisterPage
- 폼 유효성 검사 (클라이언트 사이드)
- 제출 중 로딩 상태
- API 에러를 인라인으로 표시

### 5. 테마 토글
- 시스템 기본값 감지 (`prefers-color-scheme`)
- localStorage에 저장
- Tailwind `darkMode: 'class'` 또는 선택한 방식으로 구현

---

## 테스트 항목

### 백엔드 (단위/통합 테스트)
- 회원가입: 성공, 이메일 중복, 형식 오류
- 로그인: 성공, 비밀번호 오류, 이메일 없음
- JWT: 생성, 검증, 만료된 토큰
- DB는 인메모리 SQLite (`:memory:`) 사용 (mock 금지)

### 프론트엔드
- 로그인 폼 렌더링 및 제출
- 에러 표시
- 로그아웃 후 보호된 경로 접근 차단
