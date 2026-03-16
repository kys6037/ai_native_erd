package com.erd.repository

import com.erd.config.Database
import com.erd.model.ErdData
import com.erd.model.Project
import com.fasterxml.jackson.databind.ObjectMapper
import java.util.UUID

class ProjectRepository(private val mapper: ObjectMapper) {

    private val defaultErdData = ErdData()

    private fun parseErdData(json: String): ErdData = try {
        mapper.readValue(json, ErdData::class.java)
    } catch (e: Exception) {
        defaultErdData
    }

    fun findAllByUser(userId: Int): List<Project> {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                """SELECT p.id, p.user_id, p.name, p.description, p.erd_data, p.created_at, p.updated_at, p.invite_token
                   FROM projects p
                   WHERE p.user_id = ?
                   UNION
                   SELECT p.id, p.user_id, p.name, p.description, p.erd_data, p.created_at, p.updated_at, p.invite_token
                   FROM projects p
                   JOIN project_members pm ON pm.project_id = p.id
                   WHERE pm.user_id = ?
                   ORDER BY updated_at DESC"""
            ).use { stmt ->
                stmt.setInt(1, userId)
                stmt.setInt(2, userId)
                val rs = stmt.executeQuery()
                val list = mutableListOf<Project>()
                while (rs.next()) {
                    list.add(Project(
                        id = rs.getInt("id"),
                        userId = rs.getInt("user_id"),
                        name = rs.getString("name"),
                        description = rs.getString("description"),
                        erdData = parseErdData(rs.getString("erd_data")),
                        createdAt = rs.getString("created_at"),
                        updatedAt = rs.getString("updated_at"),
                        inviteToken = rs.getString("invite_token")
                    ))
                }
                return list
            }
        }
    }

    fun findById(id: Int): Project? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, user_id, name, description, erd_data, created_at, updated_at, invite_token FROM projects WHERE id = ?"
            ).use { stmt ->
                stmt.setInt(1, id)
                val rs = stmt.executeQuery()
                if (!rs.next()) return null
                return Project(
                    id = rs.getInt("id"),
                    userId = rs.getInt("user_id"),
                    name = rs.getString("name"),
                    description = rs.getString("description"),
                    erdData = parseErdData(rs.getString("erd_data")),
                    createdAt = rs.getString("created_at"),
                    updatedAt = rs.getString("updated_at"),
                    inviteToken = rs.getString("invite_token")
                )
            }
        }
    }

    fun findByInviteToken(token: String): Project? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, user_id, name, description, erd_data, created_at, updated_at, invite_token FROM projects WHERE invite_token = ?"
            ).use { stmt ->
                stmt.setString(1, token)
                val rs = stmt.executeQuery()
                if (!rs.next()) return null
                return Project(
                    id = rs.getInt("id"),
                    userId = rs.getInt("user_id"),
                    name = rs.getString("name"),
                    description = rs.getString("description"),
                    erdData = parseErdData(rs.getString("erd_data")),
                    createdAt = rs.getString("created_at"),
                    updatedAt = rs.getString("updated_at"),
                    inviteToken = rs.getString("invite_token")
                )
            }
        }
    }

    fun generateInviteToken(projectId: Int): String {
        val token = UUID.randomUUID().toString().replace("-", "")
        Database.getConnection().use { conn ->
            conn.prepareStatement("UPDATE projects SET invite_token = ? WHERE id = ?").use { stmt ->
                stmt.setString(1, token)
                stmt.setInt(2, projectId)
                stmt.executeUpdate()
            }
        }
        return token
    }

    fun isMember(projectId: Int, userId: Int): Boolean {
        Database.getConnection().use { conn ->
            conn.prepareStatement("SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?").use { stmt ->
                stmt.setInt(1, projectId)
                stmt.setInt(2, userId)
                return stmt.executeQuery().next()
            }
        }
    }

    fun addMember(projectId: Int, userId: Int) {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "INSERT OR IGNORE INTO project_members (project_id, user_id) VALUES (?, ?)"
            ).use { stmt ->
                stmt.setInt(1, projectId)
                stmt.setInt(2, userId)
                stmt.executeUpdate()
            }
        }
    }

    fun create(userId: Int, name: String, description: String?): Project {
        val erdJson = mapper.writeValueAsString(defaultErdData)
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "INSERT INTO projects (user_id, name, description, erd_data) VALUES (?, ?, ?, ?)"
            ).use { stmt ->
                stmt.setInt(1, userId)
                stmt.setString(2, name)
                stmt.setString(3, description)
                stmt.setString(4, erdJson)
                stmt.executeUpdate()
            }
            // Reuse same connection to avoid deadlock with pool size=1
            conn.prepareStatement(
                "SELECT id, user_id, name, description, erd_data, created_at, updated_at, invite_token FROM projects WHERE id = last_insert_rowid()"
            ).use { stmt ->
                val rs = stmt.executeQuery()
                rs.next()
                return Project(
                    id = rs.getInt("id"),
                    userId = rs.getInt("user_id"),
                    name = rs.getString("name"),
                    description = rs.getString("description"),
                    erdData = parseErdData(rs.getString("erd_data")),
                    createdAt = rs.getString("created_at"),
                    updatedAt = rs.getString("updated_at"),
                    inviteToken = rs.getString("invite_token")
                )
            }
        }
    }

    fun update(id: Int, name: String?, description: String?, erdData: ErdData?): Project? {
        val sets = mutableListOf<String>()
        if (name != null) sets.add("name = ?")
        if (description != null) sets.add("description = ?")
        if (erdData != null) sets.add("erd_data = ?")
        sets.add("updated_at = datetime('now')")

        if (sets.size == 1) return findById(id) // only updated_at, skip

        val sql = "UPDATE projects SET ${sets.joinToString(", ")} WHERE id = ?"
        Database.getConnection().use { conn ->
            conn.prepareStatement(sql).use { stmt ->
                var idx = 1
                if (name != null) stmt.setString(idx++, name)
                if (description != null) stmt.setString(idx++, description)
                if (erdData != null) stmt.setString(idx++, mapper.writeValueAsString(erdData))
                stmt.setInt(idx, id)
                stmt.executeUpdate()
            }
        }
        return findById(id)
    }

    fun delete(id: Int) {
        Database.getConnection().use { conn ->
            conn.prepareStatement("DELETE FROM projects WHERE id = ?").use { stmt ->
                stmt.setInt(1, id)
                stmt.executeUpdate()
            }
        }
    }
}
