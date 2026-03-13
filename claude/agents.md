# Agent Pipeline

## 에이전트 구성

이 프로젝트는 3종류의 에이전트가 순서대로 협력한다.
각 에이전트는 `CLAUDE.md`와 이 파일을 먼저 읽고 자신의 역할을 확인한다.

```
┌─────────────┐     handoff.md     ┌─────────────┐     handoff.md     ┌─────────────┐
│   BUILDER   │ ─────────────────> │   CHECKER   │ ─────────────────> │   FIXER     │
│   (구현)    │                    │   (검증)    │                    │  (수정)     │
└─────────────┘                    └─────────────┘                    └─────────────┘
                                          │                                  │
                                          │ 오류 없음                        │ 수정 완료
                                          ▼                                  ▼
                                   다음 Phase로                        CHECKER 재실행
```

에이전트 간 소통은 `claude/handoff.md` 파일로 한다.
직전 에이전트가 이 파일을 작성하면, 다음 에이전트가 읽고 이어서 시작한다.

---

## BUILDER Agent

### 역할
지정된 phase를 구현한다.

### 시작 조건
- `claude/handoff.md`에 `phase: N`, `agent: builder` 명시
- 없으면 Phase 01부터 시작

### 작업 순서
1. `CLAUDE.md` 읽기
2. `handoff.md` 읽기 (현재 phase, 이전 에이전트 메모 확인)
3. `phases/phase-0N-*.md` 읽기
4. 관련 `features/*.md` 읽기
5. 구현
6. 자체 빌드/테스트 실행
7. `handoff.md` 업데이트 → `agent: checker` 로 넘김

### 완료 조건
- 해당 phase의 `완료 조건` 체크리스트 항목이 구현됨
- 빌드 성공
- 기본 테스트 통과

### handoff.md 작성 형식
```markdown
## Phase N — Builder 완료

- agent: checker
- phase: N
- completed_at: 2024-01-15T10:30:00Z

### 구현된 항목
- ...

### 주의사항 (Checker에게)
- ...

### 미구현/스킵 항목 (이유)
- 없음
```

---

## CHECKER Agent

### 역할
Builder가 구현한 내용을 검증한다. **코드를 수정하지 않는다.**

### 시작 조건
- `handoff.md`에 `agent: checker` 명시

### 검증 항목

#### 1. 빌드 검증
```bash
# 백엔드
./gradlew build   # 또는 선택한 빌드 도구

# 프론트엔드
npm run build
npm run type-check
npm run lint
```

#### 2. 테스트 실행
```bash
./gradlew test
npm run test
```

#### 3. API 계약 검증
`04-api-contract.md` 스펙과 실제 구현 비교:
- 엔드포인트 경로 일치
- 요청/응답 형식 일치
- 상태 코드 일치
- 에러 형식 일치 `{ "error": "..." }`

#### 4. 보안 검증
- SQL 쿼리에 파라미터 바인딩 사용 여부 (문자열 연결 금지)
- 비밀번호가 응답에 포함되지 않는지
- 인증 미들웨어가 올바른 경로에 적용됐는지
- 타 사용자 데이터 격리 (userId 조건 포함 여부)

#### 5. Phase 완료 조건 확인
해당 `phases/phase-0N-*.md`의 완료 조건 체크리스트 항목 하나씩 확인

#### 6. 도메인 모델 일치 확인
`03-domain-models.md`의 필드와 실제 구현 비교

### 결과 판정

**통과 (Pass)**: 모든 항목 통과
→ `handoff.md`에 `phase: N+1`, `agent: builder` 작성

**실패 (Fail)**: 하나라도 미통과
→ `handoff.md`에 `agent: fixer` 작성, 오류 목록 상세히 기록

### handoff.md 작성 형식 (통과)
```markdown
## Phase N — Checker 통과

- agent: builder
- phase: N+1
- checked_at: 2024-01-15T11:00:00Z

### 검증 결과
- 빌드: ✅
- 테스트: ✅ (백엔드 12/12, 프론트엔드 8/8)
- API 계약: ✅
- 보안: ✅
- 완료 조건: ✅

### 다음 Phase 참고사항
- ...
```

### handoff.md 작성 형식 (실패)
```markdown
## Phase N — Checker 실패

- agent: fixer
- phase: N
- checked_at: 2024-01-15T11:00:00Z

### 오류 목록

#### [FAIL-001] 타입: build_error
파일: backend/src/main/kotlin/.../ProjectApi.kt:45
내용: Unresolved reference: projectService
재현: ./gradlew build

#### [FAIL-002] 타입: test_failure
테스트: ProjectApiTest.`create project returns 201`
내용: Expected 201 but was 500
로그: ...

#### [FAIL-003] 타입: security
파일: backend/src/main/kotlin/.../ProjectRepository.kt:32
내용: SQL 쿼리에 문자열 연결 사용 (SQL Injection 위험)
코드: "SELECT * WHERE id = $id"

#### [FAIL-004] 타입: contract_mismatch
엔드포인트: DELETE /api/projects/:id
기대: 204 (no body)
실제: 200 + { "deleted": true }
```

---

## FIXER Agent

### 역할
Checker가 발견한 오류를 수정한다.

### 시작 조건
- `handoff.md`에 `agent: fixer` 명시

### 작업 순서
1. `handoff.md`의 오류 목록 읽기
2. 각 오류를 유형별로 분류
3. 의존성 순서로 수정 (빌드 에러 → 타입 에러 → 테스트 실패 → 계약 불일치 → 보안)
4. 수정 후 해당 오류 재현 명령 실행하여 확인
5. 전체 빌드/테스트 재실행
6. `handoff.md` 업데이트 → `agent: checker` 로 넘김

### 수정 우선순위
```
1. build_error       — 빌드 자체가 안 되면 다른 것 확인 불가
2. type_error        — 런타임 에러 원인
3. test_failure      — 기능 오작동
4. contract_mismatch — API 계약 위반
5. security          — 보안 취약점
6. missing_feature   — 미구현 기능
```

### 수정 범위
- 오류 목록에 있는 것만 수정
- 목록에 없는 것은 임의로 수정하지 않음
- 수정 중 새 오류 발견 시: handoff.md의 오류 목록에 추가

### handoff.md 작성 형식
```markdown
## Phase N — Fixer 완료

- agent: checker
- phase: N
- fixed_at: 2024-01-15T12:00:00Z

### 수정 결과

#### [FAIL-001] ✅ 수정됨
방법: ProjectService를 App.kt에서 주입하도록 수정

#### [FAIL-002] ✅ 수정됨
방법: ProjectRepository.findById에 userId 조건 추가

#### [FAIL-003] ✅ 수정됨
방법: 문자열 연결 → 파라미터 바인딩으로 변경

#### [FAIL-004] ✅ 수정됨
방법: 204 응답, body 제거

### 추가 발견 오류
- 없음

### Checker에게
- FAIL-002 수정으로 다른 테스트에 영향 가능. 전체 테스트 재실행 권장.
```

---

## 파이프라인 실행 흐름

```
초기 상태: handoff.md 없음

BUILDER (Phase 01)
  → 구현 완료
  → handoff.md 작성 (agent: checker, phase: 1)

CHECKER (Phase 01)
  → 검증
  → [통과] handoff.md 갱신 (agent: builder, phase: 2)
  → [실패] handoff.md 갱신 (agent: fixer, phase: 1)

FIXER (Phase 01, if failed)
  → 수정 완료
  → handoff.md 갱신 (agent: checker, phase: 1)

CHECKER (Phase 01, retry)
  → 검증
  → [통과] handoff.md 갱신 (agent: builder, phase: 2)

... Phase 08까지 반복 ...

CHECKER (Phase 08, 통과)
  → handoff.md: phase: complete
  → 프로젝트 완료
```

### 무한 루프 방지
- 같은 phase에서 FIXER가 3회 이상 실행됐는데 동일 오류가 반복되면:
  - handoff.md에 `status: blocked` 기록
  - 인간 개입 요청

---

## handoff.md 위치

`claude/handoff.md` — 항상 이 하나의 파일을 덮어쓴다.
이전 내용은 git 히스토리로 보존된다.

---

## Git 연동 규칙

### 브랜치 전략
```
main          — checker 통과한 것만 merge
phase/01      — phase 01 작업 브랜치
phase/02      — phase 02 작업 브랜치
...
```

### 각 에이전트의 git 작업

**BUILDER**
```bash
# phase 시작 시
git checkout -b phase/0N

# 구현 완료 후 commit
git add .
git commit -m "feat(phase-0N): <구현 내용 요약>"
```

**CHECKER**
```bash
# 별도 commit 없음 — handoff.md만 수정
git add claude/handoff.md
git commit -m "chore(phase-0N): checker 통과"

# 통과 시 main에 merge
git checkout main
git merge phase/0N
git branch -d phase/0N
```

**FIXER**
```bash
# 수정 완료 후 commit (같은 브랜치에서)
git add .
git commit -m "fix(phase-0N): <수정 내용 요약>"
```

### commit 후 handoff.md 갱신
각 에이전트는 commit 직후 `handoff.md`를 다음 에이전트로 갱신하고 별도 commit:
```bash
git add claude/handoff.md
git commit -m "chore: handoff → <next-agent> phase-0N"
```

### .gitignore 권장 항목
```
# 환경 변수
.env
*.env.local

# 빌드 결과
build/
dist/
*.jar
node_modules/

# IDE
.idea/
.vscode/

# DB
*.db
```

### 최종 git log 예시
```
feat(phase-08): builder — polish 완료
chore: handoff → checker phase-08
chore(phase-08): checker 통과
chore: handoff → builder phase-08
fix(phase-07): fixer — 테스트 커버리지 보완
chore: handoff → checker phase-07
chore(phase-07): checker 통과
chore: handoff → builder phase-07
feat(phase-07): builder — 테스트 구현
...
```
