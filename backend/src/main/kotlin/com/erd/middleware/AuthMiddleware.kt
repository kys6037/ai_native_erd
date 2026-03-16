package com.erd.middleware

import com.erd.config.Auth
import com.erd.model.ErrorResponse
import io.javalin.http.Context
import io.jsonwebtoken.JwtException
import org.slf4j.LoggerFactory

object AuthMiddleware {
    private val log = LoggerFactory.getLogger(AuthMiddleware::class.java)

    fun handle(ctx: Context) {
        // Skip CORS preflight
        if (ctx.method().name == "OPTIONS") return

        val path = ctx.path()
        // Skip auth endpoints
        if (path.startsWith("/api/auth/")) return

        val header = ctx.header("Authorization")
        if (header == null || !header.startsWith("Bearer ")) {
            ctx.status(401).json(ErrorResponse("Missing Authorization header"))
            return
        }

        val token = header.removePrefix("Bearer ").trim()
        try {
            val userId = Auth.validateToken(token)
            ctx.attribute("userId", userId)
        } catch (e: JwtException) {
            log.debug("Invalid token: ${e.message}")
            ctx.status(401).json(ErrorResponse("Invalid or expired token"))
        } catch (e: Exception) {
            log.debug("Token validation error: ${e.message}")
            ctx.status(401).json(ErrorResponse("Invalid or expired token"))
        }
    }
}
