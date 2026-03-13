# Technology Stack Decisions

## Backend
- **Kotlin**: null safety, data classes, concise syntax — ideal for small team
- **Javalin 6.x**: lightweight REST + WebSocket, no magic DI, simple setup
- **Gradle Kotlin DSL + Shadow**: standard JVM build, fat JAR for single-file deploy
- **SQLite + HikariCP**: zero-config DB, WAL mode for concurrent reads, pool=1 for WAL simplicity
- **JJWT**: standard JWT library for JVM
- **jBCrypt**: simple bcrypt implementation, cost=12
- **Jackson + kotlin module**: standard JSON, works well with data classes

## Frontend
- **React 18 + TypeScript**: type safety, large ecosystem
- **Vite 5**: fast dev server, easy proxy config
- **Tailwind CSS**: utility-first, dark mode via class strategy
- **Zustand**: minimal state management with persist middleware
- **React Router v6**: standard routing
- **Axios**: request/response interceptors for auth token injection

## Deployment
- Frontend build → copied into `backend/src/main/resources/public/`
- Single fat JAR serves both API and static files
