# Feature: Real-time Collaboration

## 프로토콜

### 연결 흐름
```
1. WebSocket 연결
2. 클라이언트 → { "type": "auth", "token": "..." }
3. 서버 검증:
   - JWT 무효 → 연결 종료
   - 프로젝트 접근 권한 없음 → 연결 종료
   - 성공 → { "type": "auth_ok" }
4. 서버 → 현재 Yjs 상태 바이너리 전송 (있으면)
5. 서버 → 같은 방 다른 클라이언트에게 { "type": "user_joined", userId, userName }
```

### 업데이트 흐름
```
클라이언트 A → 서버: Yjs update 바이너리
서버: yjsDocState[projectId] 업데이트
서버 → 클라이언트 B, C, ...: 동일 바이너리 브로드캐스트
```

### 연결 종료
```
서버: rooms에서 제거
서버 → 다른 클라이언트: { "type": "user_left", userId }
```

---

## Yjs 문서 구조

```javascript
ydoc.getMap('tables')        // key: tableId, value: ErdTable
ydoc.getMap('relationships') // key: relId, value: ErdRelationship
```

---

## 동기화 규칙

### Yjs → ERD 상태
- `tables` 맵 변경 감지 → ERD 상태 업데이트
- **undo 히스토리에 추가하지 않음** (협업 변경은 히스토리 오염 방지)

### ERD 상태 → Yjs
- 로컬 변경 시 `ydoc.transact(() => {...}, 'local')` 으로 업데이트
- `origin === 'remote'`인 업데이트는 서버로 재전송하지 않음

### 프로젝트 전환
**반드시 이전 WebSocket 연결을 닫은 후 새 연결 생성**
닫지 않으면 두 연결에서 메시지가 중복 수신됨

---

## 재연결 전략
```
연결 끊김 → 1초 후 재시도
재시도 실패 → 2초, 4초, 8초... (지수 백오프)
최대 대기: 30초
연결 성공 → 대기 시간 초기화
```

---

## 충돌 해결

Yjs CRDT 기반이므로 대부분 자동 처리:

| 상황 | 결과 |
|------|------|
| 두 사용자 동시에 같은 필드 수정 | Last-Write-Wins |
| 한 사용자 삭제, 다른 사용자 편집 | 삭제 우선 |
| 오프라인 중 변경 후 재연결 | 자동 3-way 머지 |

---

## 서버 상태 관리

```
rooms:        Map<projectId, Set<연결>>     // 현재 접속자
yjsDocState:  Map<projectId, ByteArray>     // 최신 Yjs 상태 캐시
```

서버는 Yjs 바이너리를 **파싱하지 않고** 단순 저장/전달만 한다.
스레드 세이프 자료구조 사용 필수.
