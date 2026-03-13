# Feature: Authentication

## 동작 명세

### 회원가입 (`POST /api/auth/register`)
1. 이메일 형식 검증 → 실패 시 400
2. 이메일 중복 확인 → 중복 시 400 "Email already exists"
3. 비밀번호 bcrypt 해시 (cost ≥ 10)
4. users 테이블 INSERT
5. JWT 생성 (만료: 7일) → 201 반환

### 로그인 (`POST /api/auth/login`)
1. 이메일로 사용자 조회 → 없으면 401
2. bcrypt 검증 → 불일치 시 401
3. JWT 생성 → 200 반환

### 인증 미들웨어
- 대상: `/api/auth/*` 제외한 모든 `/api/*`
- `Authorization: Bearer <token>` 헤더 추출
- JWT 검증 → 성공 시 `userId`를 request context에 저장
- 실패: 401

### 프론트엔드 토큰 관리
- 로그인 성공 → 토큰 + 사용자 정보를 영구 저장소에 저장
- 모든 API 요청에 `Authorization: Bearer <token>` 자동 첨부
- 401 응답 → 저장소 초기화 + `/login` 이동
- 앱 시작 시 저장된 토큰 복원

## 에러 케이스
| 상황 | 코드 | 메시지 |
|------|------|--------|
| 이메일 형식 오류 | 400 | "Invalid email format" |
| 이메일 중복 | 400 | "Email already exists" |
| 비밀번호 불일치 | 401 | "Invalid credentials" |
| 토큰 없음 | 401 | "Missing Authorization header" |
| 토큰 무효/만료 | 401 | "Invalid or expired token" |

## 보안 규칙
- JWT 시크릿: 환경변수 `JWT_SECRET` (최소 32자)
- 비밀번호는 절대 응답에 포함하지 않음
- 토큰 갱신 없음 (7일 후 재로그인)
