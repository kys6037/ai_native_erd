package com.erd.api

import com.erd.exception.ForbiddenException
import com.erd.exception.NotFoundException
import com.erd.repository.DictionaryEntry
import com.erd.repository.DictionaryRepository
import com.erd.repository.ProjectRepository
import io.javalin.Javalin

fun registerDictionaryRoutes(app: Javalin, dictionaryRepo: DictionaryRepository, projectRepo: ProjectRepository) {

    // GET /api/projects/:id/dictionary?tableName=xxx → List<DictionaryEntry>
    app.get("/api/projects/{id}/dictionary") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        val tableName = ctx.queryParam("tableName")
        ctx.json(dictionaryRepo.findAll(projectId, tableName))
    }

    // POST /api/projects/:id/dictionary → DictionaryEntry (upsert, 200)
    app.post("/api/projects/{id}/dictionary") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        val req = ctx.bodyAsClass(DictionaryEntry::class.java)
        val entry = req.copy(projectId = projectId)
        ctx.json(dictionaryRepo.upsert(entry))
    }

    // DELETE /api/projects/:id/dictionary/:entryId → 204
    app.delete("/api/projects/{id}/dictionary/{entryId}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val entryId = ctx.pathParam("entryId").toIntOrNull()
            ?: throw NotFoundException("Entry not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        dictionaryRepo.delete(entryId, projectId)
        ctx.status(204)
    }
}
