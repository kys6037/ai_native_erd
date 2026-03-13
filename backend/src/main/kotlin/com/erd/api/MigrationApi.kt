package com.erd.api

import com.erd.exception.BadRequestException
import com.erd.exception.ForbiddenException
import com.erd.exception.NotFoundException
import com.erd.repository.ProjectRepository
import com.erd.repository.VersionRepository
import com.erd.service.MigrationGenerator
import com.erd.service.SchemaDiffer
import io.javalin.Javalin

data class GenerateMigrationRequest(
    val fromVersionId: Int?,
    val toVersionId: Int?,
    val dialect: String?
)

data class GenerateMigrationResponse(
    val sql: String,
    val diff: com.erd.service.SchemaDiff
)

fun registerMigrationRoutes(app: Javalin, versionRepo: VersionRepository, projectRepo: ProjectRepository) {

    // POST /api/migration/generate
    app.post("/api/migration/generate") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val req = ctx.bodyAsClass(GenerateMigrationRequest::class.java)

        val fromVersionId = req.fromVersionId ?: throw BadRequestException("fromVersionId is required")
        val toVersionId = req.toVersionId ?: throw BadRequestException("toVersionId is required")
        val dialect = req.dialect ?: throw BadRequestException("dialect is required")

        val fromVersion = versionRepo.findById(fromVersionId)
            ?: throw NotFoundException("From version not found")
        val toVersion = versionRepo.findById(toVersionId)
            ?: throw NotFoundException("To version not found")

        // Verify both versions belong to projects owned by the user
        val fromProject = projectRepo.findById(fromVersion.projectId)
            ?: throw NotFoundException("Project not found")
        if (fromProject.userId != userId) throw ForbiddenException("Access denied")

        val toProject = projectRepo.findById(toVersion.projectId)
            ?: throw NotFoundException("Project not found")
        if (toProject.userId != userId) throw ForbiddenException("Access denied")

        val diff = SchemaDiffer.diff(fromVersion.erdData, toVersion.erdData)
        val sql = MigrationGenerator.generate(diff, fromVersion.erdData, toVersion.erdData, dialect)

        ctx.json(GenerateMigrationResponse(sql, diff))
    }
}
