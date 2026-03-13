# Phase 05 — Real-time Collaboration

## 목표
Yjs CRDT 기반 WebSocket 협업. 여러 사용자가 같은 ERD를 동시 편집한다.

---

## 완료 조건

- [ ] 두 브라우저 탭에서 같은 프로젝트 열기
- [ ] 탭 A 테이블 추가 → 3초 내 탭 B에 표시
- [ ] 탭 A 컬럼 수정 → 탭 B에 반영
- [ ] 연결 끊겼다 재연결 → 최신 상태 동기화
- [ ] 접속자 아바타 표시
- [ ] 연결 끊김 배너 표시 + 자동 재연결
- [ ] 프로젝트 전환 시 이전 WS 연결 완전 종료 (메시지 중복 없음)

---

## 아키텍처

```
클라이언트: Yjs 문서를 상태로 관리
서버: Yjs 바이너리를 불투명하게 브로드캐스트 (파싱 불필요)
```

Yjs 문서 구조:
```
ydoc.getMap('tables')        → tableId: ErdTable
ydoc.getMap('relationships') → relId: ErdRelationship
```

---

## 백엔드 구현 항목

### WebSocket 핸들러

상태 관리:
```
rooms: Map<projectId, Set<Connection>>
yjsDocState: Map<projectId, ByteArray>  // 최신 상태 캐시
```

연결 시:
1. connection 객체 생성 (인증 전 상태)

첫 텍스트 메시지 처리 (`{ type: "auth", token: "..." }`):
1. JWT 검증 → 실패 시 연결 종료
2. 프로젝트 접근 권한 확인 → 없으면 연결 종료
3. rooms에 추가
4. `{ type: "auth_ok" }` 전송
5. yjsDocState[projectId] 있으면 바이너리로 전송 (현재 상태 동기화)
6. 다른 연결에 `{ type: "user_joined", userId, userName }` 브로드캐스트

바이너리 메시지 처리 (Yjs update):
1. 인증된 연결인지 확인
2. yjsDocState[projectId] 업데이트
3. 같은 방의 다른 연결에 그대로 브로드캐스트

연결 종료 시:
- rooms에서 제거
- 다른 연결에 `{ type: "user_left", userId }` 브로드캐스트

동시성: `ConcurrentHashMap`, `CopyOnWriteArraySet` 또는 동등한 스레드 세이프 자료구조 사용

---

## 프론트엔드 구현 항목

### 협업 훅 (useCollaboration 또는 동등한 것)

**중요**: 프로젝트 전환 시 이전 WebSocket 반드시 닫기

```
초기화:
  ydoc = new Y.Doc()
  ws = new WebSocket(url)
  ws.onopen → { type: "auth", token } 전송

인증 성공 후:
  setConnected(true)
  수신한 Yjs 상태 바이너리 → Y.applyUpdate(ydoc, data)

바이너리 수신:
  Y.applyUpdate(ydoc, data)  origin = 'remote'

Yjs 로컬 변경 감지:
  ydoc.on('update', (update, origin) => {
    if (origin === 'remote') return  // 원격에서 온 것 재전송 방지
    ws.send(update)  // 바이너리 전송
  })

연결 종료:
  setConnected(false)
  지수 백오프로 재연결 (1s → 2s → 4s → ... → 30s 최대)
```

### ERD 상태 ↔ Yjs 양방향 동기화

**Yjs → ERD 상태**:
```
yTables.observe(() => {
  const tables = [...yTables.values()]
  const rels = [...yRelationships.values()]
  setErdFromCollaboration({ tables, rels })
})
```

**ERD 상태 → Yjs** (로컬 변경 시):
```
ydoc.transact(() => {
  // 삭제된 항목 제거
  // 추가/수정된 항목 업데이트
}, 'local')  // origin: 'local' → 서버로 전송됨
```

**중요**: `setErdFromCollaboration`은 undo 히스토리에 추가하지 않음 (협업 변경은 히스토리 오염 방지)

### 협업 UI
- 툴바에 접속자 아바타 (이름 첫 글자 + 배경색)
- 3명 초과 시 "+N" 표시
- 연결 끊김 시 하단 배너: "연결 끊김. 재연결 중..."

---

## 테스트 항목

### 백엔드
- 두 클라이언트 연결 → 한쪽 업데이트 → 다른 쪽 수신
- 인증 실패 → 연결 종료
- 연결 종료 시 rooms에서 정리
- 인증 전 데이터 메시지 무시

### 프론트엔드
- 연결 → 인증 → 상태 동기화 흐름
- 프로젝트 전환 시 이전 연결 종료 확인
- 재연결 지수 백오프 동작
