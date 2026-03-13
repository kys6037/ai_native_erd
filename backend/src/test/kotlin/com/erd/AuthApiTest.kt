package com.erd

import com.erd.api.registerAuthRoutes
import com.erd.config.Auth
import com.erd.config.Database
import com.erd.exception.BadRequestException
import com.erd.exception.UnauthorizedException
import com.erd.middleware.AuthMiddleware
import com.erd.model.ErrorResponse
import com.erd.repository.UserRepository
import com.erd.service.AuthService
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.kotlinModule
import io.javalin.Javalin
import io.javalin.json.JavalinJackson
import io.javalin.testtools.JavalinTest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

class AuthApiTest {

    companion object {
        val mapper: ObjectMapper = ObjectMapper().apply {
            registerModule(kotlinModule())
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        }
        private lateinit var authService: AuthService

        @JvmStatic
        @BeforeAll
        fun setupAll() {
            Database.init(":memory:")
            Auth.init("test-secret-key-for-integration-testing-32ch")
            authService = AuthService(UserRepository())
        }

        fun createApp(): Javalin {
            val app = Javalin.create { config ->
                config.jsonMapper(JavalinJackson(mapper))
            }
            app.before("/api/*") { ctx ->
                AuthMiddleware.handle(ctx)
                if (ctx.status().code == 401) ctx.skipRemainingHandlers()
            }
            registerAuthRoutes(app, authService)
            app.get("/api/protected") { ctx ->
                val userId = ctx.attribute<Int>("userId")
                ctx.json(mapOf("userId" to userId))
            }
            app.exception(BadRequestException::class.java) { e, ctx ->
                ctx.status(400).json(ErrorResponse(e.message ?: "Bad request"))
            }
            app.exception(UnauthorizedException::class.java) { e, ctx ->
                ctx.status(401).json(ErrorResponse(e.message ?: "Unauthorized"))
            }
            app.exception(Exception::class.java) { _, ctx ->
                ctx.status(500).json(ErrorResponse("Internal server error"))
            }
            return app
        }
    }

    private fun body(vararg pairs: Pair<String, String>): String =
        mapper.writeValueAsString(pairs.toMap())

    @Test
    fun `register success returns 201 with token`() = JavalinTest.test(createApp()) { _, client ->
        val res = client.post("/api/auth/register", body(
            "email" to "user1@test.com",
            "password" to "password123",
            "name" to "Test User"
        ))
        assertThat(res.code).isEqualTo(201)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["token"].asText()).isNotBlank()
        assertThat(json["user"]["email"].asText()).isEqualTo("user1@test.com")
        assertThat(json["user"]["name"].asText()).isEqualTo("Test User")
        assertThat(json["user"]["password"]).isNull()
    }

    @Test
    fun `register duplicate email returns 400`() = JavalinTest.test(createApp()) { _, client ->
        val body = body("email" to "dup1@test.com", "password" to "pass", "name" to "A")
        client.post("/api/auth/register", body)
        val res = client.post("/api/auth/register", body)
        assertThat(res.code).isEqualTo(400)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["error"].asText()).isEqualTo("Email already exists")
    }

    @Test
    fun `register invalid email format returns 400`() = JavalinTest.test(createApp()) { _, client ->
        val res = client.post("/api/auth/register", body(
            "email" to "not-an-email",
            "password" to "pass",
            "name" to "B"
        ))
        assertThat(res.code).isEqualTo(400)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["error"].asText()).isEqualTo("Invalid email format")
    }

    @Test
    fun `login success returns 200 with token`() = JavalinTest.test(createApp()) { _, client ->
        client.post("/api/auth/register", body(
            "email" to "login1@test.com",
            "password" to "mypassword",
            "name" to "Login User"
        ))
        val res = client.post("/api/auth/login", body(
            "email" to "login1@test.com",
            "password" to "mypassword"
        ))
        assertThat(res.code).isEqualTo(200)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["token"].asText()).isNotBlank()
    }

    @Test
    fun `login wrong password returns 401`() = JavalinTest.test(createApp()) { _, client ->
        client.post("/api/auth/register", body(
            "email" to "wp1@test.com",
            "password" to "correct",
            "name" to "WP User"
        ))
        val res = client.post("/api/auth/login", body(
            "email" to "wp1@test.com",
            "password" to "wrong"
        ))
        assertThat(res.code).isEqualTo(401)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["error"].asText()).isEqualTo("Invalid credentials")
    }

    @Test
    fun `login unknown email returns 401`() = JavalinTest.test(createApp()) { _, client ->
        val res = client.post("/api/auth/login", body(
            "email" to "nobody@test.com",
            "password" to "pass"
        ))
        assertThat(res.code).isEqualTo(401)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["error"].asText()).isEqualTo("Invalid credentials")
    }

    @Test
    fun `protected route without token returns 401`() = JavalinTest.test(createApp()) { _, client ->
        val res = client.get("/api/protected")
        assertThat(res.code).isEqualTo(401)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["error"].asText()).isEqualTo("Missing Authorization header")
    }

    @Test
    fun `protected route with valid token returns 200`() = JavalinTest.test(createApp()) { _, client ->
        val regRes = client.post("/api/auth/register", body(
            "email" to "auth1@test.com",
            "password" to "pass123",
            "name" to "Auth User"
        ))
        val token = mapper.readTree(regRes.body?.string())["token"].asText()
        val res = client.request("/api/protected") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(200)
    }

    @Test
    fun `protected route with invalid token returns 401`() = JavalinTest.test(createApp()) { _, client ->
        val res = client.request("/api/protected") { req ->
            req.header("Authorization", "Bearer invalidtoken")
        }
        assertThat(res.code).isEqualTo(401)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["error"].asText()).isEqualTo("Invalid or expired token")
    }
}
