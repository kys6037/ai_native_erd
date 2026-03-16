package com.erd.api

import com.erd.config.Auth
import com.erd.repository.ProjectRepository
import com.erd.repository.UserRepository
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.javalin.websocket.WsConfig
import io.javalin.websocket.WsContext
import io.jsonwebtoken.JwtException
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArraySet

private val log = LoggerFactory.getLogger("com.erd.CollaborationHandler")
private val wsMapper = jacksonObjectMapper()

data class WsSession(
    val ctx: WsContext,
    var userId: Int? = null,
    var userName: String? = null,
    var projectId: Int? = null,
    var authenticated: Boolean = false
)

object CollaborationHandler {
    private val rooms = ConcurrentHashMap<Int, CopyOnWriteArraySet<WsSession>>()
    private val erdState = ConcurrentHashMap<Int, String>()  // latest ERD JSON per project
    private val sessions = ConcurrentHashMap<String, WsSession>()

    fun configure(ws: WsConfig, projectRepo: ProjectRepository, userRepo: UserRepository) {
        ws.onConnect { ctx ->
            val sessionId = ctx.sessionId()
            val session = WsSession(ctx = ctx)
            sessions[sessionId] = session
            log.debug("WS connect: $sessionId")
        }

        ws.onMessage { ctx ->
            val sessionId = ctx.sessionId()
            val session = sessions[sessionId] ?: return@onMessage

            try {
                val message = ctx.message()
                val node = wsMapper.readTree(message)
                val type = node["type"]?.asText() ?: return@onMessage

                when (type) {
                    "auth" -> {
                        val token = node["token"]?.asText() ?: run {
                            ctx.send(wsMapper.writeValueAsString(mapOf("type" to "error", "message" to "token required")))
                            return@onMessage
                        }

                        val projectId = ctx.pathParam("projectId").toIntOrNull() ?: run {
                            ctx.send(wsMapper.writeValueAsString(mapOf("type" to "error", "message" to "invalid projectId")))
                            return@onMessage
                        }

                        // Verify JWT
                        val userId = try {
                            Auth.validateToken(token)
                        } catch (e: JwtException) {
                            ctx.send(wsMapper.writeValueAsString(mapOf("type" to "error", "message" to "invalid token")))
                            return@onMessage
                        }

                        // Check project access (owner or member)
                        val project = projectRepo.findById(projectId)
                        if (project == null || (project.userId != userId && !projectRepo.isMember(projectId, userId))) {
                            ctx.send(wsMapper.writeValueAsString(mapOf("type" to "error", "message" to "access denied")))
                            return@onMessage
                        }

                        val userName = userRepo.findById(userId)?.name ?: "User$userId"
                        session.userId = userId
                        session.userName = userName
                        session.projectId = projectId
                        session.authenticated = true

                        // Add to room
                        rooms.getOrPut(projectId) { CopyOnWriteArraySet() }.add(session)

                        // Send auth_ok + current ERD state if available
                        val currentErd = erdState[projectId]
                        if (currentErd != null) {
                            val node = wsMapper.readTree(currentErd)
                            ctx.send(wsMapper.writeValueAsString(
                                mapOf("type" to "auth_ok", "erdData" to node)
                            ))
                        } else {
                            ctx.send(wsMapper.writeValueAsString(
                                mapOf("type" to "auth_ok")
                            ))
                        }

                        // Broadcast user_joined to room (excluding sender)
                        broadcastToRoom(projectId, session, wsMapper.writeValueAsString(
                            mapOf("type" to "user_joined", "userId" to userId, "userName" to userName)
                        ))

                        log.debug("WS auth ok: userId=$userId projectId=$projectId")
                    }
                    "erd_sync" -> {
                        if (!session.authenticated) return@onMessage
                        val projectId = session.projectId ?: return@onMessage
                        // Store latest ERD state and broadcast to room
                        val dataNode = node["data"] ?: return@onMessage
                        erdState[projectId] = wsMapper.writeValueAsString(dataNode)
                        broadcastToRoom(projectId, session, message)
                    }
                    "cursor" -> {
                        if (!session.authenticated) return@onMessage
                        val projectId = session.projectId ?: return@onMessage
                        broadcastToRoom(projectId, session, message)
                    }
                    else -> {
                        log.debug("Unknown WS message type: $type")
                    }
                }
            } catch (e: Exception) {
                log.error("WS message handling error", e)
            }
        }

        ws.onClose { ctx ->
            val sessionId = ctx.sessionId()
            val session = sessions.remove(sessionId) ?: return@onClose
            val projectId = session.projectId

            if (projectId != null) {
                rooms[projectId]?.remove(session)
                if (rooms[projectId]?.isEmpty() == true) {
                    rooms.remove(projectId)
                }
                // Broadcast user_left to remaining room members
                broadcastToRoom(projectId, null, wsMapper.writeValueAsString(
                    mapOf("type" to "user_left", "userId" to session.userId)
                ))
            }
            log.debug("WS close: $sessionId")
        }

        ws.onError { ctx ->
            log.error("WS error for session ${ctx.sessionId()}: ${ctx.error()?.message}")
        }
    }

    private fun broadcastToRoom(projectId: Int, excludeSession: WsSession?, message: String) {
        val room = rooms[projectId] ?: return
        for (session in room) {
            if (excludeSession != null && session.ctx.sessionId() == excludeSession.ctx.sessionId()) continue
            try {
                session.ctx.send(message)
            } catch (e: Exception) {
                log.debug("Failed to send to session ${session.ctx.sessionId()}: ${e.message}")
            }
        }
    }
}
