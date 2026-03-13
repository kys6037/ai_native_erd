package com.erd.repository

import com.erd.config.Database
import com.erd.model.ErdData
import com.fasterxml.jackson.databind.ObjectMapper

data class VersionSummary(
    val id: Int,
    val projectId: Int,
    val versionNumber: Int,
    val message: String,
    val createdBy: Int,
    val createdAt: String
)

data class VersionDetail(
    val id: Int,
    val projectId: Int,
    val versionNumber: Int,
    val message: String,
    val erdData: ErdData,
    val createdBy: Int,
    val createdAt: String
)

class VersionRepository(private val mapper: ObjectMapper) {

    private val defaultErdData = ErdData()

    private fun parseErdData(json: String): ErdData = try {
        mapper.readValue(json, ErdData::class.java)
    } catch (e: Exception) {
        defaultErdData
    }

    fun findAll(projectId: Int): List<VersionSummary> {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, project_id, version_number, message, created_by, created_at FROM versions WHERE project_id = ? ORDER BY version_number DESC"
            ).use { stmt ->
                stmt.setInt(1, projectId)
                val rs = stmt.executeQuery()
                val list = mutableListOf<VersionSummary>()
                while (rs.next()) {
                    list.add(
                        VersionSummary(
                            id = rs.getInt("id"),
                            projectId = rs.getInt("project_id"),
                            versionNumber = rs.getInt("version_number"),
                            message = rs.getString("message"),
                            createdBy = rs.getInt("created_by"),
                            createdAt = rs.getString("created_at")
                        )
                    )
                }
                return list
            }
        }
    }

    fun findById(id: Int): VersionDetail? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, project_id, version_number, message, erd_data, created_by, created_at FROM versions WHERE id = ?"
            ).use { stmt ->
                stmt.setInt(1, id)
                val rs = stmt.executeQuery()
                if (!rs.next()) return null
                return VersionDetail(
                    id = rs.getInt("id"),
                    projectId = rs.getInt("project_id"),
                    versionNumber = rs.getInt("version_number"),
                    message = rs.getString("message"),
                    erdData = parseErdData(rs.getString("erd_data")),
                    createdBy = rs.getInt("created_by"),
                    createdAt = rs.getString("created_at")
                )
            }
        }
    }

    fun create(projectId: Int, message: String, erdData: ErdData, userId: Int): VersionDetail {
        val versionNumber = getNextVersionNumber(projectId)
        val erdJson = mapper.writeValueAsString(erdData)
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "INSERT INTO versions (project_id, version_number, message, erd_data, created_by) VALUES (?, ?, ?, ?, ?)"
            ).use { stmt ->
                stmt.setInt(1, projectId)
                stmt.setInt(2, versionNumber)
                stmt.setString(3, message)
                stmt.setString(4, erdJson)
                stmt.setInt(5, userId)
                stmt.executeUpdate()
            }
            conn.prepareStatement(
                "SELECT id, project_id, version_number, message, erd_data, created_by, created_at FROM versions WHERE id = last_insert_rowid()"
            ).use { stmt ->
                val rs = stmt.executeQuery()
                rs.next()
                return VersionDetail(
                    id = rs.getInt("id"),
                    projectId = rs.getInt("project_id"),
                    versionNumber = rs.getInt("version_number"),
                    message = rs.getString("message"),
                    erdData = parseErdData(rs.getString("erd_data")),
                    createdBy = rs.getInt("created_by"),
                    createdAt = rs.getString("created_at")
                )
            }
        }
    }

    fun getNextVersionNumber(projectId: Int): Int {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM versions WHERE project_id = ?"
            ).use { stmt ->
                stmt.setInt(1, projectId)
                val rs = stmt.executeQuery()
                return if (rs.next()) rs.getInt("next_version") else 1
            }
        }
    }
}
