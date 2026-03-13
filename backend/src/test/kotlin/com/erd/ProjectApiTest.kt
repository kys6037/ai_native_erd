package com.erd

import com.erd.api.registerAuthRoutes
import com.erd.api.registerProjectRoutes
import com.erd.config.Auth
import com.erd.config.Database
import com.erd.exception.BadRequestException
import com.erd.exception.ForbiddenException
import com.erd.exception.NotFoundException
import com.erd.exception.UnauthorizedException
import com.erd.middleware.AuthMiddleware
import com.erd.model.ErrorResponse
import com.erd.repository.ProjectRepository
import com.erd.repository.UserRepository
import com.erd.service.AuthService
import com.erd.service.ProjectService
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.kotlinModule
import io.javalin.Javalin
import io.javalin.json.JavalinJackson
import io.javalin.testtools.JavalinTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test

class ProjectApiTest {

    companion object {
        val mapper: ObjectMapper = ObjectMapper().apply {
            registerModule(kotlinModule())
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        }
        private lateinit var authService: AuthService
        private lateinit var projectService: ProjectService
        private val JSON = "application/json".toMediaType()

        @JvmStatic
        @BeforeAll
        fun setupAll() {
            Database.init(":memory:")
            Auth.init("test-secret-key-for-project-tests-32chars")
            authService = AuthService(UserRepository())
            projectService = ProjectService(ProjectRepository(mapper))
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
            registerProjectRoutes(app, projectService)
            app.exception(BadRequestException::class.java) { e, ctx ->
                ctx.status(400).json(ErrorResponse(e.message ?: "Bad request"))
            }
            app.exception(UnauthorizedException::class.java) { e, ctx ->
                ctx.status(401).json(ErrorResponse(e.message ?: "Unauthorized"))
            }
            app.exception(ForbiddenException::class.java) { e, ctx ->
                ctx.status(403).json(ErrorResponse(e.message ?: "Forbidden"))
            }
            app.exception(NotFoundException::class.java) { e, ctx ->
                ctx.status(404).json(ErrorResponse(e.message ?: "Not found"))
            }
            app.exception(Exception::class.java) { _, ctx ->
                ctx.status(500).json(ErrorResponse("Internal server error"))
            }
            return app
        }
    }

    private fun json(vararg pairs: Pair<String, Any?>): String = mapper.writeValueAsString(pairs.toMap())

    private fun postBody(str: String) = str.toRequestBody(JSON)

    private fun registerAndLogin(client: io.javalin.testtools.HttpClient, suffix: String): String {
        val res = client.post(
            "/api/auth/register",
            json("email" to "proj_$suffix@test.com", "password" to "pass123", "name" to "User $suffix")
        )
        return mapper.readTree(res.body?.string())["token"].asText()
    }

    @Test
    fun `list projects initially empty`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "list1")
        val res = client.request("/api/projects") { req -> req.header("Authorization", "Bearer $token") }
        assertThat(res.code).isEqualTo(200)
        val json = mapper.readTree(res.body?.string())
        assertThat(json.isArray).isTrue()
        assertThat(json.size()).isEqualTo(0)
    }

    @Test
    fun `create project returns 201 with erdData`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "create1")
        val res = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to "My ERD", "description" to "test desc")))
                .header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(201)
        val json = mapper.readTree(res.body?.string())
        assertThat(json["name"].asText()).isEqualTo("My ERD")
        assertThat(json["description"].asText()).isEqualTo("test desc")
        assertThat(json["erdData"]["tables"].isArray).isTrue()
    }

    @Test
    fun `create project without name returns 400`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "create2")
        val res = client.request("/api/projects") { req ->
            req.post(postBody(json("description" to "no name")))
                .header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(400)
    }

    @Test
    fun `get project by id`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "get1")
        val createRes = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to "Get Test"))).header("Authorization", "Bearer $token")
        }
        val projectId = mapper.readTree(createRes.body?.string())["id"].asInt()

        val res = client.request("/api/projects/$projectId") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(200)
        val node = mapper.readTree(res.body?.string())
        assertThat(node["id"].asInt()).isEqualTo(projectId)
        assertThat(node["name"].asText()).isEqualTo("Get Test")
    }

    @Test
    fun `update project name`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "update1")
        val createRes = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to "Old Name"))).header("Authorization", "Bearer $token")
        }
        val projectId = mapper.readTree(createRes.body?.string())["id"].asInt()

        val res = client.request("/api/projects/$projectId") { req ->
            req.put(postBody(json("name" to "New Name"))).header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(200)
        assertThat(mapper.readTree(res.body?.string())["name"].asText()).isEqualTo("New Name")
    }

    @Test
    fun `delete project returns 204`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "delete1")
        val createRes = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to "To Delete"))).header("Authorization", "Bearer $token")
        }
        val projectId = mapper.readTree(createRes.body?.string())["id"].asInt()

        val delRes = client.request("/api/projects/$projectId") { req ->
            req.delete().header("Authorization", "Bearer $token")
        }
        assertThat(delRes.code).isEqualTo(204)

        val getRes = client.request("/api/projects/$projectId") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(getRes.code).isEqualTo(404)
    }

    @Test
    fun `other user project access returns 403`() = JavalinTest.test(createApp()) { _, client ->
        val token1 = registerAndLogin(client, "owner1")
        val token2 = registerAndLogin(client, "other1")

        val createRes = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to "Private"))).header("Authorization", "Bearer $token1")
        }
        val projectId = mapper.readTree(createRes.body?.string())["id"].asInt()

        val res = client.request("/api/projects/$projectId") { req ->
            req.header("Authorization", "Bearer $token2")
        }
        assertThat(res.code).isEqualTo(403)
    }

    @Test
    fun `update erdData persists and is returned`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "erd1")
        val createRes = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to "ERD Test"))).header("Authorization", "Bearer $token")
        }
        val projectId = mapper.readTree(createRes.body?.string())["id"].asInt()

        val erdPayload = """
        {"erdData":{"tables":[{"id":"t1","name":"users","columns":[{"name":"id","type":"INT","primaryKey":true,"nullable":false,"autoIncrement":true}],"indexes":[],"x":100,"y":200,"color":"#6366f1"}],"relationships":[]}}
        """.trimIndent()

        val updateRes = client.request("/api/projects/$projectId") { req ->
            req.put(postBody(erdPayload)).header("Authorization", "Bearer $token")
        }
        assertThat(updateRes.code).isEqualTo(200)

        val getRes = client.request("/api/projects/$projectId") { req ->
            req.header("Authorization", "Bearer $token")
        }
        val tables = mapper.readTree(getRes.body?.string())["erdData"]["tables"]
        assertThat(tables.size()).isEqualTo(1)
        assertThat(tables[0]["name"].asText()).isEqualTo("users")
    }
}
