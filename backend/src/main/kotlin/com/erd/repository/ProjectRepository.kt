package com.erd.repository

import com.erd.config.Database
import com.erd.model.ErdData
import com.erd.model.Project
import com.fasterxml.jackson.databind.ObjectMapper

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
                "SELECT id, user_id, name, description, erd_data, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC"
            ).use { stmt ->
                stmt.setInt(1, userId)
                val rs = stmt.executeQuery()
                val list = mutableListOf<Project>()
                while (rs.next()) {
                    list.add(
                        Project(
                            id = rs.getInt("id"),
                            userId = rs.getInt("user_id"),
                            name = rs.getString("name"),
                            description = rs.getString("description"),
                            erdData = parseErdData(rs.getString("erd_data")),
                            createdAt = rs.getString("created_at"),
                            updatedAt = rs.getString("updated_at")
                        )
                    )
                }
                return list
            }
        }
    }

    fun findById(id: Int): Project? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, user_id, name, description, erd_data, created_at, updated_at FROM projects WHERE id = ?"
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
                    updatedAt = rs.getString("updated_at")
                )
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
                "SELECT id, user_id, name, description, erd_data, created_at, updated_at FROM projects WHERE id = last_insert_rowid()"
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
                    updatedAt = rs.getString("updated_at")
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
