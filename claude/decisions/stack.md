# Stack Decision

## Backend

- **Language**: Kotlin
- **Framework**: Javalin 6.x
- **DB Pool**: HikariCP (SQLite)
- **JWT Library**: JJWT 0.12.x
- **Password Hashing**: jBCrypt (cost=12)
- **Build Tool**: Gradle Kotlin DSL + Shadow plugin (fat JAR)

이유: 팀 1-3인 기준. Javalin은 경량 Kotlin-first HTTP 프레임워크, 설정 최소. SQLite는 외부 DB 서버 불필요(self-contained). JJWT는 JVM 표준 JWT 라이브러리.

---

## Frontend

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v3
- **State Management**: Zustand 5
- **ERD Canvas Library**: @xyflow/react (ReactFlow)
- **HTTP Client**: Axios
- **Collaboration**: Yjs + y-websocket (Phase 05)

이유: Vite는 빠른 HMR, Zustand는 보일러플레이트 없는 상태관리. ReactFlow는 노드/엣지 기반 캔버스 라이브러리 중 React 생태계에서 가장 성숙함.

---

## 프로젝트 구조

백엔드 루트: `backend/`
프론트엔드 루트: `frontend/`
빌드 출력: `backend/src/main/resources/public/` (Gradle copyFrontend 태스크)
배포: `backend/build/libs/erd.jar` (단일 fat JAR)
