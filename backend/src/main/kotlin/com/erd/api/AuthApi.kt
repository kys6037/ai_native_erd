package com.erd.api

import com.erd.model.LoginRequest
import com.erd.model.RegisterRequest
import com.erd.service.AuthService
import io.javalin.Javalin

fun registerAuthRoutes(app: Javalin, authService: AuthService) {
    app.post("/api/auth/register") { ctx ->
        val req = ctx.bodyAsClass(RegisterRequest::class.java)
        val result = authService.register(req.email, req.password, req.name)
        ctx.status(201).json(result)
    }

    app.post("/api/auth/login") { ctx ->
        val req = ctx.bodyAsClass(LoginRequest::class.java)
        val result = authService.login(req.email, req.password)
        ctx.status(200).json(result)
    }
}
