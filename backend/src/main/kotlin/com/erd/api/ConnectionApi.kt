package com.erd.api

import com.erd.exception.BadRequestException
import com.erd.exception.NotFoundException
import com.erd.model.DbConnectionRequest
import com.erd.model.ErdData
import com.erd.repository.ConnectionRepository
import io.javalin.Javalin

fun registerConnectionRoutes(app: Javalin, connectionRepo: ConnectionRepository) {
    // GET /api/connections → list
    app.get("/api/connections") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        ctx.json(connectionRepo.findAll(userId))
    }

    // POST /api/connections → create (201)
    app.post("/api/connections") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val req = ctx.bodyAsClass(DbConnectionRequest::class.java)
        if (req.name.isBlank()) throw BadRequestException("name is required")
        if (req.type.isBlank()) throw BadRequestException("type is required")
        val conn = connectionRepo.create(userId, req)
        ctx.status(201).json(conn)
    }

    // PUT /api/connections/:id → update
    app.put("/api/connections/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Connection not found")
        val req = ctx.bodyAsClass(DbConnectionRequest::class.java)
        val conn = connectionRepo.update(id, userId, req)
            ?: throw NotFoundException("Connection not found")
        ctx.json(conn)
    }

    // DELETE /api/connections/:id → 204
    app.delete("/api/connections/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Connection not found")
        connectionRepo.delete(id, userId)
        ctx.status(204)
    }

    // POST /api/connections/:id/test → { success: true }
    app.post("/api/connections/{id}/test") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Connection not found")
        val conn = connectionRepo.findById(id, userId)
            ?: throw NotFoundException("Connection not found")
        // Stub: just check that config is present and return success
        val success = conn.host != null || conn.database != null
        ctx.json(mapOf("success" to success, "message" to "Connection check not implemented (stub)"))
    }

    // GET /api/connections/:id/schemas → return empty list (stub)
    app.get("/api/connections/{id}/schemas") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Connection not found")
        connectionRepo.findById(id, userId)
            ?: throw NotFoundException("Connection not found")
        ctx.json(emptyList<String>())
    }

    // POST /api/connections/:id/import → return empty ErdData (stub)
    app.post("/api/connections/{id}/import") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Connection not found")
        connectionRepo.findById(id, userId)
            ?: throw NotFoundException("Connection not found")
        ctx.json(ErdData())
    }
}
