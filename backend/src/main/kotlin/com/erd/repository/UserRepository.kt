package com.erd.repository

import com.erd.config.Database
import com.erd.model.User

class UserRepository {

    fun findByEmail(email: String): User? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, email, password, name, created_at FROM users WHERE email = ?"
            ).use { stmt ->
                stmt.setString(1, email)
                val rs = stmt.executeQuery()
                if (!rs.next()) return null
                return User(
                    id = rs.getInt("id"),
                    email = rs.getString("email"),
                    password = rs.getString("password"),
                    name = rs.getString("name"),
                    createdAt = rs.getString("created_at")
                )
            }
        }
    }

    fun create(email: String, hashedPassword: String, name: String): User {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "INSERT INTO users (email, password, name) VALUES (?, ?, ?)"
            ).use { stmt ->
                stmt.setString(1, email)
                stmt.setString(2, hashedPassword)
                stmt.setString(3, name)
                stmt.executeUpdate()
            }
            conn.prepareStatement(
                "SELECT id, email, password, name, created_at FROM users WHERE email = ?"
            ).use { stmt ->
                stmt.setString(1, email)
                val rs = stmt.executeQuery()
                rs.next()
                return User(
                    id = rs.getInt("id"),
                    email = rs.getString("email"),
                    password = rs.getString("password"),
                    name = rs.getString("name"),
                    createdAt = rs.getString("created_at")
                )
            }
        }
    }
}
