package com.erd.api

import com.erd.model.CreateProjectRequest
import com.erd.model.InviteTokenResponse
import com.erd.model.JoinProjectResponse
import com.erd.model.UpdateProjectRequest
import com.erd.model.toResponse
import com.erd.model.toSummary
import com.erd.service.ProjectService
import io.javalin.Javalin

fun registerProjectRoutes(app: Javalin, projectService: ProjectService) {
    app.get("/api/projects") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val projects = projectService.listProjects(userId)
        ctx.json(projects.map { it.toSummary(userId) })
    }

    app.post("/api/projects") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val req = ctx.bodyAsClass(CreateProjectRequest::class.java)
        val project = projectService.createProject(userId, req.name, req.description)
        ctx.status(201).json(project.toResponse())
    }

    app.get("/api/projects/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw com.erd.exception.NotFoundException("Project not found")
        val project = projectService.getProject(id, userId)
        ctx.json(project.toResponse())
    }

    app.put("/api/projects/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw com.erd.exception.NotFoundException("Project not found")
        val req = ctx.bodyAsClass(UpdateProjectRequest::class.java)
        val project = projectService.updateProject(id, userId, req.name, req.description, req.erdData)
        ctx.json(project.toResponse())
    }

    app.delete("/api/projects/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw com.erd.exception.NotFoundException("Project not found")
        projectService.deleteProject(id, userId)
        ctx.status(204)
    }

    // POST /api/projects/:id/invite  — generate invite token (owner only)
    app.post("/api/projects/{id}/invite") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull()
            ?: throw com.erd.exception.NotFoundException("Project not found")
        val token = projectService.generateInviteToken(id, userId)
        val frontendBase = System.getenv("FRONTEND_URL") ?: "https://ainativeerd.vercel.app"
        ctx.json(InviteTokenResponse(token, "$frontendBase/join/$token"))
    }

    // POST /api/projects/join/:token  — join via invite link
    app.post("/api/projects/join/{token}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val token = ctx.pathParam("token")
        val project = projectService.joinByToken(token, userId)
        ctx.json(JoinProjectResponse(project.id, project.name))
    }
}
