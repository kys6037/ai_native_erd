package com.erd

import com.erd.api.registerAuthRoutes
import com.erd.api.registerProjectRoutes
import com.erd.api.registerVersionRoutes
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
import com.erd.repository.VersionRepository
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

class VersionApiTest {

    companion object {
        val mapper: ObjectMapper = ObjectMapper().apply {
            registerModule(kotlinModule())
            configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
        }
        private lateinit var authService: AuthService
        private lateinit var projectService: ProjectService
        private lateinit var versionRepo: VersionRepository
        private lateinit var projectRepo: ProjectRepository
        private val JSON = "application/json".toMediaType()

        @JvmStatic
        @BeforeAll
        fun setupAll() {
            Database.init(":memory:")
            Auth.init("test-secret-key-for-version-tests-32chars!")
            val userRepo = UserRepository()
            authService = AuthService(userRepo)
            projectRepo = ProjectRepository(mapper)
            projectService = ProjectService(projectRepo)
            versionRepo = VersionRepository(mapper)
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
            registerVersionRoutes(app, versionRepo, projectRepo)
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

    /** Register a new user and return the JWT token */
    private fun registerAndLogin(client: io.javalin.testtools.HttpClient, suffix: String): String {
        val res = client.post(
            "/api/auth/register",
            json("email" to "ver_$suffix@test.com", "password" to "pass123", "name" to "Version User $suffix")
        )
        return mapper.readTree(res.body?.string())["token"].asText()
    }

    /** Create a project and return its id */
    private fun createProject(client: io.javalin.testtools.HttpClient, token: String, name: String): Int {
        val res = client.request("/api/projects") { req ->
            req.post(postBody(json("name" to name))).header("Authorization", "Bearer $token")
        }
        return mapper.readTree(res.body?.string())["id"].asInt()
    }

    // -------------------------------------------------------------------------
    // POST /api/projects/:id/versions → 201
    // -------------------------------------------------------------------------

    @Test
    fun `create version returns 201`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_create1")
        val projectId = createProject(client, token, "Version Test Project")

        val res = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "Initial version")))
                .header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(201)
        val body = mapper.readTree(res.body?.string())
        assertThat(body["message"].asText()).isEqualTo("Initial version")
        assertThat(body["versionNumber"].asInt()).isEqualTo(1)
        assertThat(body["projectId"].asInt()).isEqualTo(projectId)
    }

    // -------------------------------------------------------------------------
    // POST /api/projects/:id/versions without message → 400
    // -------------------------------------------------------------------------

    @Test
    fun `create version without message returns 400`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_create2")
        val projectId = createProject(client, token, "Version Test Project 2")

        val res = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "")))
                .header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(400)
    }

    // -------------------------------------------------------------------------
    // GET /api/projects/:id/versions → list contains created version
    // -------------------------------------------------------------------------

    @Test
    fun `list versions contains created version`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_list1")
        val projectId = createProject(client, token, "Version List Test")

        // Create two versions
        client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "First version")))
                .header("Authorization", "Bearer $token")
        }
        client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "Second version")))
                .header("Authorization", "Bearer $token")
        }

        val res = client.request("/api/projects/$projectId/versions") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(200)
        val body = mapper.readTree(res.body?.string())
        assertThat(body.isArray).isTrue()
        assertThat(body.size()).isEqualTo(2)
    }

    // -------------------------------------------------------------------------
    // GET /api/projects/:id/versions → initially empty
    // -------------------------------------------------------------------------

    @Test
    fun `list versions initially empty`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_list2")
        val projectId = createProject(client, token, "Empty Versions Project")

        val res = client.request("/api/projects/$projectId/versions") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(200)
        val body = mapper.readTree(res.body?.string())
        assertThat(body.isArray).isTrue()
        assertThat(body.size()).isEqualTo(0)
    }

    // -------------------------------------------------------------------------
    // GET /api/projects/:id/versions/:versionId → returns erd_data
    // -------------------------------------------------------------------------

    @Test
    fun `get version by id returns erdData`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_get1")
        val projectId = createProject(client, token, "Get Version Test")

        val createRes = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "Snapshot version")))
                .header("Authorization", "Bearer $token")
        }
        val versionId = mapper.readTree(createRes.body?.string())["id"].asInt()

        val res = client.request("/api/projects/$projectId/versions/$versionId") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(200)
        val body = mapper.readTree(res.body?.string())
        assertThat(body["id"].asInt()).isEqualTo(versionId)
        assertThat(body["message"].asText()).isEqualTo("Snapshot version")
        assertThat(body["erdData"]).isNotNull()
        assertThat(body["erdData"]["tables"].isArray).isTrue()
    }

    // -------------------------------------------------------------------------
    // POST /api/projects/:id/versions/:versionId/restore → 200, project updated
    // -------------------------------------------------------------------------

    @Test
    fun `restore version updates project erdData`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_restore1")
        val projectId = createProject(client, token, "Restore Test Project")

        // First: update project with specific ERD data
        val erdPayload = """{"erdData":{"tables":[{"id":"t1","name":"users","columns":[{"name":"id","type":"INT","primaryKey":true,"nullable":false,"autoIncrement":true}],"indexes":[],"x":100,"y":100,"color":"#6366f1"}],"relationships":[]}}"""
        client.request("/api/projects/$projectId") { req ->
            req.put(postBody(erdPayload)).header("Authorization", "Bearer $token")
        }

        // Capture a version of this state
        val versionRes = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "Before change"))).header("Authorization", "Bearer $token")
        }
        val versionId = mapper.readTree(versionRes.body?.string())["id"].asInt()

        // Now change the project to have no tables
        val emptyErd = """{"erdData":{"tables":[],"relationships":[]}}"""
        client.request("/api/projects/$projectId") { req ->
            req.put(postBody(emptyErd)).header("Authorization", "Bearer $token")
        }

        // Restore the earlier version
        val restoreRes = client.request("/api/projects/$projectId/versions/$versionId/restore") { req ->
            req.post("".toRequestBody(JSON)).header("Authorization", "Bearer $token")
        }
        assertThat(restoreRes.code).isEqualTo(200)

        // Verify the project now has the restored ERD data
        val getRes = client.request("/api/projects/$projectId") { req ->
            req.header("Authorization", "Bearer $token")
        }
        val tables = mapper.readTree(getRes.body?.string())["erdData"]["tables"]
        assertThat(tables.size()).isEqualTo(1)
        assertThat(tables[0]["name"].asText()).isEqualTo("users")
    }

    // -------------------------------------------------------------------------
    // Restore creates an auto-save version before restoring
    // -------------------------------------------------------------------------

    @Test
    fun `restore auto-saves current state before restoring`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_autosave1")
        val projectId = createProject(client, token, "Auto-save Test Project")

        // Create a version to restore to
        val v1Res = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "Version 1"))).header("Authorization", "Bearer $token")
        }
        val v1Id = mapper.readTree(v1Res.body?.string())["id"].asInt()

        // Count versions before restore
        val beforeList = mapper.readTree(
            client.request("/api/projects/$projectId/versions") { req ->
                req.header("Authorization", "Bearer $token")
            }.body?.string()
        )
        val countBefore = beforeList.size()

        // Restore
        client.request("/api/projects/$projectId/versions/$v1Id/restore") { req ->
            req.post("".toRequestBody(JSON)).header("Authorization", "Bearer $token")
        }

        // Count versions after restore — should have one more (the auto-save)
        val afterList = mapper.readTree(
            client.request("/api/projects/$projectId/versions") { req ->
                req.header("Authorization", "Bearer $token")
            }.body?.string()
        )
        val countAfter = afterList.size()

        assertThat(countAfter).isEqualTo(countBefore + 1)

        // The newest version should be an auto-save
        // Versions are returned in DESC order, so index 0 is the newest
        val newestMessage = afterList[0]["message"].asText()
        assertThat(newestMessage).contains("Auto-save")
    }

    // -------------------------------------------------------------------------
    // Access control: other user cannot access project versions
    // -------------------------------------------------------------------------

    @Test
    fun `other user cannot list versions of another users project`() = JavalinTest.test(createApp()) { _, client ->
        val token1 = registerAndLogin(client, "v_owner1")
        val token2 = registerAndLogin(client, "v_other1")

        val projectId = createProject(client, token1, "Owner's Project")

        val res = client.request("/api/projects/$projectId/versions") { req ->
            req.header("Authorization", "Bearer $token2")
        }
        assertThat(res.code).isEqualTo(403)
    }

    // -------------------------------------------------------------------------
    // Version numbers increment
    // -------------------------------------------------------------------------

    @Test
    fun `version numbers increment with each created version`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_incr1")
        val projectId = createProject(client, token, "Increment Test Project")

        val v1Res = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "v1"))).header("Authorization", "Bearer $token")
        }
        val v2Res = client.request("/api/projects/$projectId/versions") { req ->
            req.post(postBody(json("message" to "v2"))).header("Authorization", "Bearer $token")
        }

        val v1Num = mapper.readTree(v1Res.body?.string())["versionNumber"].asInt()
        val v2Num = mapper.readTree(v2Res.body?.string())["versionNumber"].asInt()

        assertThat(v1Num).isEqualTo(1)
        assertThat(v2Num).isEqualTo(2)
    }

    // -------------------------------------------------------------------------
    // Get non-existent version → 404
    // -------------------------------------------------------------------------

    @Test
    fun `get non-existent version returns 404`() = JavalinTest.test(createApp()) { _, client ->
        val token = registerAndLogin(client, "v_notfound1")
        val projectId = createProject(client, token, "404 Version Test")

        val res = client.request("/api/projects/$projectId/versions/99999") { req ->
            req.header("Authorization", "Bearer $token")
        }
        assertThat(res.code).isEqualTo(404)
    }
}
