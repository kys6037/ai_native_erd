package com.erd.service

import com.erd.config.Auth
import com.erd.exception.BadRequestException
import com.erd.exception.UnauthorizedException
import com.erd.model.AuthResponse
import com.erd.model.toResponse
import com.erd.repository.UserRepository

class AuthService(private val userRepo: UserRepository) {

    private val emailRegex = Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")

    fun register(email: String?, password: String?, name: String?): AuthResponse {
        if (email.isNullOrBlank() || password.isNullOrBlank() || name.isNullOrBlank()) {
            throw BadRequestException("email, password, and name are required")
        }
        if (!emailRegex.matches(email)) {
            throw BadRequestException("Invalid email format")
        }
        if (userRepo.findByEmail(email) != null) {
            throw BadRequestException("Email already exists")
        }
        val user = userRepo.create(email, Auth.hashPassword(password), name)
        val token = Auth.generateToken(user.id)
        return AuthResponse(token, user.toResponse())
    }

    fun login(email: String?, password: String?): AuthResponse {
        if (email.isNullOrBlank() || password.isNullOrBlank()) {
            throw UnauthorizedException("Invalid credentials")
        }
        val user = userRepo.findByEmail(email)
            ?: throw UnauthorizedException("Invalid credentials")
        if (!Auth.checkPassword(password, user.password)) {
            throw UnauthorizedException("Invalid credentials")
        }
        val token = Auth.generateToken(user.id)
        return AuthResponse(token, user.toResponse())
    }
}
