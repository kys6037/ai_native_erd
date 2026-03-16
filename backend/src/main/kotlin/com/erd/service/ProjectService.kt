package com.erd.service

import com.erd.exception.BadRequestException
import com.erd.exception.ForbiddenException
import com.erd.exception.NotFoundException
import com.erd.model.ErdData
import com.erd.model.Project
import com.erd.repository.ProjectRepository

class ProjectService(private val projectRepo: ProjectRepository) {

    fun listProjects(userId: Int): List<Project> = projectRepo.findAllByUser(userId)

    fun getProject(id: Int, userId: Int): Project {
        val project = projectRepo.findById(id) ?: throw NotFoundException("Project not found")
        if (project.userId != userId && !projectRepo.isMember(id, userId))
            throw ForbiddenException("Access denied")
        return project
    }

    fun generateInviteToken(projectId: Int, userId: Int): String {
        val project = projectRepo.findById(projectId) ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Only the owner can generate invite links")
        return projectRepo.generateInviteToken(projectId)
    }

    fun joinByToken(token: String, userId: Int): Project {
        val project = projectRepo.findByInviteToken(token) ?: throw NotFoundException("Invalid or expired invite link")
        if (project.userId == userId) throw BadRequestException("You are already the owner of this project")
        if (projectRepo.isMember(project.id, userId)) throw BadRequestException("You are already a member of this project")
        projectRepo.addMember(project.id, userId)
        return project
    }

    fun createProject(userId: Int, name: String?, description: String?): Project {
        if (name.isNullOrBlank()) throw BadRequestException("name is required")
        return projectRepo.create(userId, name, description)
    }

    fun updateProject(id: Int, userId: Int, name: String?, description: String?, erdData: ErdData?): Project {
        val project = projectRepo.findById(id) ?: throw NotFoundException("Project not found")
        if (project.userId != userId && !projectRepo.isMember(id, userId))
            throw ForbiddenException("Access denied")
        return projectRepo.update(id, name, description, erdData)
            ?: throw NotFoundException("Project not found")
    }

    fun deleteProject(id: Int, userId: Int) {
        val project = projectRepo.findById(id) ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Only the owner can delete this project")
        projectRepo.delete(id)
    }
}
