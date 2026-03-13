# Handoff

- agent: deployed
- phase: 8 (완료) + 배포 완료
- completed_at: 2026-03-13T10:10:00Z

## 전체 Phase 진행 기록

### Phase 01 ✅ — Foundation (인증 + 프로젝트 스캐폴드)
**구현**: JWT 인증(register/login/7일 토큰), bcrypt(cost=12), SQLite+HikariCP, fat JAR 빌드
**이슈/해결**:
- `enableWebjars()` Javalin 6.x에서 제거됨 → `config.staticFiles.add("/public")` 방식으로 변경
- Gradle npm 태스크 Windows 호환성 → `cmd /c npm` 사용
- HikariCP pool size 기본값에서 SQLite 쓰기 잠금 경합 → `maximumPoolSize=1` 설정
**테스트**: 백엔드 13개, 프론트 5개

### Phase 02 ✅ — Core ERD Canvas
**구현**: ProjectRepository(CRUD), ERD 캔버스(@xyflow/react), Zustand erdStore(undo/redo 50단계, isDirty), autoLayout(BFS), FK 드래그 연결
**이슈/해결**:
- `NodeProps` generic 타입 오류 → `ErdTable & Record<string, unknown>` 패턴 사용
- `nodeTypes` 컴포넌트 외부 선언 필수 (내부 선언 시 매 렌더마다 remount)
- ProjectRepository pool 데드락 → 쿼리 순서 재정렬
**테스트**: 프론트 13개 (erdStore 8개 포함)

### Phase 03 ✅ — Import/Export (DDL)
**구현**: DDL 생성기(MySQL/PostgreSQL/Oracle/MSSQL), DDL 파서(SQL→ERD), DB 연결 stub, ImportModal, ExportModal
**이슈/해결**:
- Oracle DDL `NUMBER(p,s)` 타입 파싱 엣지케이스 → regex 보완
- DB 연결 실제 JDBC: 드라이버 번들 크기 문제로 stub 처리 (범위 밖)
**결정**: PNG/PDF 내보내기는 범위 외 (html-to-image 번들 크기 과다)

### Phase 04 ✅ — Versioning + Migration
**구현**: VersionRepository(스냅샷 저장), SchemaDiffer(테이블/컬럼 diff), MigrationGenerator(FK 순서 위상정렬), VersionModal, DiffModal
**이슈/해결**:
- FK 삭제 순서: 순환 의존 테이블 DROP 시 FOREIGN KEY 위반 → 위상정렬 알고리즘으로 해결
- 롤백 시 현재 ERD 상태 덮어쓰기 확인 모달 추가

### Phase 05 ✅ — Realtime Collaboration
**구현**: WebSocket 서버(Javalin ws), Yjs CRDT 바이너리 브로드캐스트, JWT 핸드셰이크, useCollaboration hook, 접속자 아바타
**이슈/해결**:
- WebSocket JWT 인증: `?token=` query param 방식 사용 (헤더 불가)
- Yjs 바이너리 vs JSON diff: CRDT 선택으로 충돌 없는 동기화 보장

### Phase 06 ✅ — Data Dictionary + Indexes
**구현**: DictionaryRepository(UPSERT), DictionaryModal(테이블/컬럼 설명), IndexesPanel(인덱스 CRUD)
**이슈/해결**: UPSERT `ON CONFLICT DO UPDATE` SQLite 문법 확인

### Phase 07 ✅ — Testing
**구현**: DdlGeneratorTest(4 dialects), DdlParserTest, SchemaDifferTest, MigrationGeneratorTest, VersionApiTest
**커버리지**: 주요 비즈니스 로직 단위 테스트 완료

### Phase 08 ✅ — Polish
**구현**: 자동저장(3초 debounce), Ctrl+K SearchModal, ErrorBoundary, 빈 상태 UX, React.lazy 코드 분할
**이슈/해결**: Vitest config 분리(vitest.config.ts), Zustand store reset 패턴 정립

---

## 배포 완료 (2026-03-13)

### Fly.io 백엔드
- URL: https://ai-native-erd.fly.dev
- 리전: nrt (도쿄), 256MB RAM, 1 shared CPU
- 볼륨: `erd_data` 1GB at `/data`
- 배포 이슈 해결 과정:
  1. Depot(기본 원격 빌더) TLS 인증서 오류 → `--depot=false` 플래그로 우회
  2. `backend/.gradle` lock 파일이 build context에 포함되어 오류 → `.dockerignore` 추가
  3. Javalin이 `localhost:8080` 바인딩 → Fly.io proxy 불통 → `app.start("0.0.0.0", port)` 수정

### 검증
```
curl -sk -X POST https://ai-native-erd.fly.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
# → 401 (앱 정상 응답)
```

### 다음 단계
- [ ] Vercel 프론트엔드 배포 (vercel.json 준비 완료)
- [ ] VITE_API_URL 환경변수를 Fly.io URL로 설정
