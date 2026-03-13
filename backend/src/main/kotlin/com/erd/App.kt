package com.erd

import com.erd.api.CollaborationHandler
import com.erd.api.registerAuthRoutes
import com.erd.api.registerConnectionRoutes
import com.erd.api.registerDdlRoutes
import com.erd.api.registerDictionaryRoutes
import com.erd.api.registerMigrationRoutes
import com.erd.api.registerProjectRoutes
import com.erd.api.registerVersionRoutes
import com.erd.config.Auth
import com.erd.config.Database
import com.erd.exception.BadRequestException
import com.erd.exception.ForbiddenException
import com.erd.exception.NotFoundException
import com.erd.exception.UnauthorizedException
import com.erd.middleware.AuthMiddleware
import com.erd.model.ErrorResponse
import com.erd.repository.ConnectionRepository
import com.erd.repository.DictionaryRepository
import com.erd.repository.ProjectRepository
import com.erd.repository.UserRepository
import com.erd.repository.VersionRepository
import com.erd.service.AuthService
import com.erd.service.ProjectService
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.module.kotlin.kotlinModule
import io.javalin.Javalin
import io.javalin.json.JavalinJackson
import org.slf4j.LoggerFactory

private val log = LoggerFactory.getLogger("com.erd.App")

object App

fun main() {
    val jwtSecret = System.getenv("JWT_SECRET") ?: "dev-secret-change-in-production-min32chars"
    val dbPath = System.getenv("DB_PATH") ?: "./erd.db"
    val port = System.getenv("PORT")?.toIntOrNull() ?: 7070

    // Initialize
    Database.init(dbPath)
    Auth.init(jwtSecret)

    // Jackson config
    val mapper = com.fasterxml.jackson.databind.ObjectMapper().apply {
        registerModule(kotlinModule())
        configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    }

    // DI wiring
    val userRepo = UserRepository()
    val authService = AuthService(userRepo)
    val projectRepo = ProjectRepository(mapper)
    val projectService = ProjectService(projectRepo)
    val connectionRepo = ConnectionRepository()
    val versionRepo = VersionRepository(mapper)
    val dictionaryRepo = DictionaryRepository()

    val hasFrontend = App::class.java.getResource("/public/index.html") != null
    val app = Javalin.create { config ->
        config.jsonMapper(JavalinJackson(mapper))
        if (hasFrontend) {
            config.staticFiles.add("/public")
        }
        config.bundledPlugins.enableCors { cors ->
            cors.addRule { rule ->
                rule.anyHost()
            }
        }
    }

    // Auth middleware for /api/* (skip /api/auth/*)
    app.before("/api/*") { ctx ->
        AuthMiddleware.handle(ctx)
        // If middleware set 401, halt further processing
        if (ctx.status().code == 401) {
            ctx.skipRemainingHandlers()
        }
    }

    // Routes
    registerAuthRoutes(app, authService)
    registerProjectRoutes(app, projectService)
    registerDdlRoutes(app)
    registerConnectionRoutes(app, connectionRepo)
    registerVersionRoutes(app, versionRepo, projectRepo)
    registerMigrationRoutes(app, versionRepo, projectRepo)
    registerDictionaryRoutes(app, dictionaryRepo, projectRepo)

    // WebSocket collaboration
    app.ws("/ws/collab/{projectId}") { ws ->
        CollaborationHandler.configure(ws, projectRepo)
    }

    // SPA fallback — serve index.html for non-API routes
    app.get("/*") { ctx ->
        if (!ctx.path().startsWith("/api") && hasFrontend) {
            ctx.result(
                Javalin::class.java.getResourceAsStream("/public/index.html")
                    ?: return@get
            )
            ctx.contentType("text/html")
        }
    }

    // Global exception handlers
    app.exception(BadRequestException::class.java) { e, ctx ->
        ctx.status(400).json(ErrorResponse(e.message ?: "Bad request"))
    }
    app.exception(UnauthorizedException::class.java) { e, ctx ->
        ctx.status(401).json(ErrorResponse(e.message ?: "Unauthorized"))
    }
    app.exception(ForbiddenException::class.java) { e, ctx ->
        ctx.status(403).json(ErrorResponse(e.message ?: "Forbidden"))
    }
    app.exception(NotFoundException::class.java) { e, ctx ->
        ctx.status(404).json(ErrorResponse(e.message ?: "Not found"))
    }
    app.exception(Exception::class.java) { e, ctx ->
        log.error("Unhandled exception", e)
        ctx.status(500).json(ErrorResponse("Internal server error"))
    }

    app.start("0.0.0.0", port)
    log.info("ERD server started on port $port")
}
