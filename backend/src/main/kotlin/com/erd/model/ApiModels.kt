package com.erd.model

data class RegisterRequest(
    val email: String?,
    val password: String?,
    val name: String?
)

data class LoginRequest(
    val email: String?,
    val password: String?
)

data class UserResponse(
    val id: Int,
    val email: String,
    val name: String,
    val createdAt: String
)

data class AuthResponse(
    val token: String,
    val user: UserResponse
)

data class ErrorResponse(
    val error: String
)

fun User.toResponse() = UserResponse(id, email, name, createdAt)

// Project DTOs
data class CreateProjectRequest(
    val name: String?,
    val description: String? = null
)

data class UpdateProjectRequest(
    val name: String? = null,
    val description: String? = null,
    val erdData: ErdData? = null
)

data class ProjectSummaryResponse(
    val id: Int,
    val userId: Int,
    val name: String,
    val description: String?,
    val createdAt: String,
    val updatedAt: String
)

data class ProjectResponse(
    val id: Int,
    val userId: Int,
    val name: String,
    val description: String?,
    val erdData: ErdData,
    val createdAt: String,
    val updatedAt: String
)

fun Project.toResponse() = ProjectResponse(id, userId, name, description, erdData, createdAt, updatedAt)
fun Project.toSummary() = ProjectSummaryResponse(id, userId, name, description, createdAt, updatedAt)

// DDL DTOs
data class GenerateDdlRequest(val erdData: ErdData, val dialect: String)
data class GenerateDdlResponse(val sql: String)
data class ParseDdlRequest(val sql: String, val dialect: String = "mysql")
data class ParseDdlResponse(val erdData: ErdData, val warnings: List<String>)

// DbConnection DTOs
data class DbConnectionRequest(
    val name: String,
    val type: String,
    val host: String?,
    val port: Int?,
    val database: String?,
    val username: String?,
    val password: String?,
    val ssl: Boolean = false
)

data class DbConnectionResponse(
    val id: Int,
    val name: String,
    val type: String,
    val host: String?,
    val port: Int?,
    val database: String?,
    val username: String?,
    val password: String? = null,
    val ssl: Boolean
)
