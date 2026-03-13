package com.erd.config

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.mindrot.jbcrypt.BCrypt
import java.util.Date
import javax.crypto.SecretKey

object Auth {
    private lateinit var secretKey: SecretKey
    private const val EXPIRY_MS = 7L * 24 * 60 * 60 * 1000 // 7 days

    fun init(secret: String) {
        require(secret.length >= 32) { "JWT_SECRET must be at least 32 characters" }
        secretKey = Keys.hmacShaKeyFor(secret.toByteArray())
    }

    fun hashPassword(password: String): String = BCrypt.hashpw(password, BCrypt.gensalt(12))

    fun checkPassword(plain: String, hashed: String): Boolean = BCrypt.checkpw(plain, hashed)

    fun generateToken(userId: Int): String = Jwts.builder()
        .subject(userId.toString())
        .issuedAt(Date())
        .expiration(Date(System.currentTimeMillis() + EXPIRY_MS))
        .signWith(secretKey)
        .compact()

    fun validateToken(token: String): Int {
        val claims = Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
        return claims.payload.subject.toInt()
    }
}
