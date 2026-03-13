# ERD Designer — Claude Agent Guide

## Agent의 역할 확인 (가장 먼저)

**`claude/handoff.md`를 먼저 읽는다.**
파일에 `agent: builder / checker / fixer`와 현재 `phase`가 명시되어 있다.
파일이 없으면 → BUILDER, Phase 01부터 시작.

각 에이전트의 역할과 파이프라인 흐름: **`agents.md`** 참조

---

## 파일 읽는 순서

```
0. handoff.md              — 내 역할 확인 (없으면 builder/phase-01)
1. CLAUDE.md               (현재) — 원칙
2. agents.md               — 에이전트 파이프라인
3. 01-requirements.md      — 무엇을 만드는가
4. 02-tech-constraints.md  — 기술 선택 경계
5. 03-domain-models.md     — 데이터 구조
6. 04-api-contract.md      — API 스펙
7. 05-ui-requirements.md   — 화면 요구사항
8. phases/phase-0N-*.md    — 현재 phase
9. features/*.md           — 관련 기능 상세
```

`decisions/stack.md`: 기술 스택 선택 기록. Phase 01 시작 전 작성.

BUILDER는 `02-tech-constraints.md`의 제약 안에서 기술 스택과 구조를 스스로 결정한다.
> 선택 기준: 요구사항을 가장 단순하게 충족하는 것. 과잉 엔지니어링 금지.

---

## 의사결정 원칙

### 기술 선택 시
- 팀 규모 1-3인 기준으로 단순한 쪽 선택
- 외부 서비스 의존 최소화 (self-contained 우선)
- 선택한 이유를 `decisions/stack.md`에 한 줄로 기록

### 코드 작성 시
- 요청된 기능만 구현한다. 미래를 위한 추상화 금지
- 에러는 명확한 메시지와 함께 일관된 형식으로 응답
- 테스트는 실제 의존성으로 작성한다 (mock DB 금지)
- 보안 경계: 사용자 입력은 항상 검증, 내부 함수는 신뢰

### 구조 결정 시
- 디렉토리 구조는 프레임워크 관례를 따른다
- 파일 수를 최소화한다 — 기능이 작으면 하나의 파일로
- 상태는 한 곳에서만 관리한다

---

## 품질 기준

각 phase 완료 전 확인:

| 항목 | 기준 |
|------|------|
| 빌드 | 경고 없이 성공 |
| 테스트 | 전체 통과 |
| API 계약 | `04-api-contract.md` 스펙 준수 |
| 에러 처리 | 4xx/5xx 모두 처리 |
| 타입 안전성 | 런타임 타입 에러 없음 |
| 보안 | SQL Injection, XSS 없음 |

---

## 프로젝트 완료 기준

- [x] Phase 1–8 전체 통과
- [x] 인증: 로그인/로그아웃/보호된 라우트
- [x] ERD 편집: 저장 후 새로고침해도 복원
- [x] DDL 4가지 dialect 정확히 생성
- [x] 버전 롤백 정상 동작
- [x] 마이그레이션 SQL FK 순서 정확
- [x] 협업: 두 탭 동시 편집 동기화
- [x] 다크/라이트 테마 전환
- [x] 단일 JAR/컨테이너로 배포 가능

---

## 현재 프로젝트 상태 (2026-03-13)

### 배포 현황
- **백엔드**: https://ai-native-erd.fly.dev (Fly.io, nrt 리전, 256MB RAM)
  - SQLite 영속 볼륨: `/data/erd.db` (1GB)
  - Docker 이미지: `registry.fly.io/ai-native-erd:deployment-01KKKARKBEFH53DGW5YF8FS7TE`
- **프론트엔드**: https://ainativeerd.vercel.app (Vercel, iad1 리전)

### 주요 의사결정 기록
| 결정 | 이유 | 날짜 |
|------|------|------|
| Javalin `app.start("0.0.0.0", port)` | Fly.io proxy가 `0.0.0.0` 바인딩 요구, `localhost` 바인딩 시 proxy 불통 | 2026-03-13 |
| `.dockerignore`에 `backend/.gradle`, `backend/build` 추가 | 빌드 중 Gradle lock 파일이 원격 Docker builder에 전송되어 "locked file" 오류 발생 | 2026-03-13 |
| `fly deploy --depot=false` | Depot(원격 빌더) TLS 인증서 오류로 기본 빌더 우회 | 2026-03-13 |
| SQLite + HikariCP pool (max 1) | 다중 연결 시 WAL 모드에서도 쓰기 잠금 경합 발생, pool size=1로 직렬화 | Phase 01 |
| fat JAR (shadowJar) + 프론트엔드 내장 | 단일 배포 파일로 운영 단순화 | Phase 01 |
| Yjs binary sync (WebSocket) | CRDT 기반이므로 충돌 없는 실시간 협업, JSON diff보다 정확 | Phase 05 |

### 알려진 이슈
- DB connection import/schema 기능은 stub (JDBC 드라이버 미포함)
- Fly.io free tier: 비활성 시 머신 자동 중지 (첫 요청 시 ~3초 cold start)
