package com.erd.api

import com.erd.exception.BadRequestException
import com.erd.exception.ForbiddenException
import com.erd.exception.NotFoundException
import com.erd.model.toResponse
import com.erd.repository.ProjectRepository
import com.erd.repository.VersionRepository
import io.javalin.Javalin

data class CreateVersionRequest(val message: String?)

fun registerVersionRoutes(app: Javalin, versionRepo: VersionRepository, projectRepo: ProjectRepository) {

    // GET /api/projects/:id/versions → List<VersionSummary>
    app.get("/api/projects/{id}/versions") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        ctx.json(versionRepo.findAll(projectId))
    }

    // POST /api/projects/:id/versions → { message: String } → VersionDetail (201)
    app.post("/api/projects/{id}/versions") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        val req = ctx.bodyAsClass(CreateVersionRequest::class.java)
        if (req.message.isNullOrBlank()) throw BadRequestException("message is required")
        val version = versionRepo.create(projectId, req.message, project.erdData, userId)
        ctx.status(201).json(version)
    }

    // GET /api/projects/:id/versions/:versionId → VersionDetail
    app.get("/api/projects/{id}/versions/{versionId}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val versionId = ctx.pathParam("versionId").toIntOrNull()
            ?: throw NotFoundException("Version not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        val version = versionRepo.findById(versionId)
            ?: throw NotFoundException("Version not found")
        if (version.projectId != projectId) throw ForbiddenException("Access denied")
        ctx.json(version)
    }

    // POST /api/projects/:id/versions/:versionId/restore
    app.post("/api/projects/{id}/versions/{versionId}/restore") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projectId = ctx.pathParam("id").toIntOrNull()
            ?: throw NotFoundException("Project not found")
        val versionId = ctx.pathParam("versionId").toIntOrNull()
            ?: throw NotFoundException("Version not found")
        val project = projectRepo.findById(projectId)
            ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        val version = versionRepo.findById(versionId)
            ?: throw NotFoundException("Version not found")
        if (version.projectId != projectId) throw ForbiddenException("Access denied")

        // 1. Auto-save current state
        versionRepo.create(
            projectId,
            "Auto-save before restore v${version.versionNumber}",
            project.erdData,
            userId
        )

        // 2. Update project.erd_data to version's erd_data
        val updated = projectRepo.update(projectId, null, null, version.erdData)
            ?: throw NotFoundException("Project not found")

        // 3. Return updated Project
        ctx.json(updated.toResponse())
    }
}
