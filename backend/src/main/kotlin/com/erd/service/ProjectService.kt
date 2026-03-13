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
        if (project.userId != userId) throw ForbiddenException("Access denied")
        return project
    }

    fun createProject(userId: Int, name: String?, description: String?): Project {
        if (name.isNullOrBlank()) throw BadRequestException("name is required")
        return projectRepo.create(userId, name, description)
    }

    fun updateProject(id: Int, userId: Int, name: String?, description: String?, erdData: ErdData?): Project {
        val project = projectRepo.findById(id) ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        return projectRepo.update(id, name, description, erdData)
            ?: throw NotFoundException("Project not found")
    }

    fun deleteProject(id: Int, userId: Int) {
        val project = projectRepo.findById(id) ?: throw NotFoundException("Project not found")
        if (project.userId != userId) throw ForbiddenException("Access denied")
        projectRepo.delete(id)
    }
}
