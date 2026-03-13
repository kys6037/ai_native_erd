package com.erd.repository

import com.erd.config.Database

data class DictionaryEntry(
    val id: Int? = null,
    val projectId: Int,
    val tableName: String,
    val columnName: String?,
    val description: String?,
    val dataStandard: String?,
    val domain: String?,
    val example: String?,
    val updatedAt: String? = null
)

class DictionaryRepository {

    fun findAll(projectId: Int, tableName: String? = null): List<DictionaryEntry> {
        Database.getConnection().use { conn ->
            val sql = if (tableName != null) {
                "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE project_id = ? AND table_name = ? ORDER BY table_name, column_name"
            } else {
                "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE project_id = ? ORDER BY table_name, column_name"
            }
            conn.prepareStatement(sql).use { stmt ->
                stmt.setInt(1, projectId)
                if (tableName != null) stmt.setString(2, tableName)
                val rs = stmt.executeQuery()
                val list = mutableListOf<DictionaryEntry>()
                while (rs.next()) {
                    list.add(
                        DictionaryEntry(
                            id = rs.getInt("id"),
                            projectId = rs.getInt("project_id"),
                            tableName = rs.getString("table_name"),
                            columnName = rs.getString("column_name"),
                            description = rs.getString("description"),
                            dataStandard = rs.getString("data_standard"),
                            domain = rs.getString("domain"),
                            example = rs.getString("example"),
                            updatedAt = rs.getString("updated_at")
                        )
                    )
                }
                return list
            }
        }
    }

    fun findByTableAndColumn(projectId: Int, tableName: String, columnName: String?): DictionaryEntry? {
        Database.getConnection().use { conn ->
            val sql = if (columnName != null) {
                "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE project_id = ? AND table_name = ? AND column_name = ?"
            } else {
                "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE project_id = ? AND table_name = ? AND column_name IS NULL"
            }
            conn.prepareStatement(sql).use { stmt ->
                stmt.setInt(1, projectId)
                stmt.setString(2, tableName)
                if (columnName != null) stmt.setString(3, columnName)
                val rs = stmt.executeQuery()
                if (!rs.next()) return null
                return DictionaryEntry(
                    id = rs.getInt("id"),
                    projectId = rs.getInt("project_id"),
                    tableName = rs.getString("table_name"),
                    columnName = rs.getString("column_name"),
                    description = rs.getString("description"),
                    dataStandard = rs.getString("data_standard"),
                    domain = rs.getString("domain"),
                    example = rs.getString("example"),
                    updatedAt = rs.getString("updated_at")
                )
            }
        }
    }

    fun upsert(entry: DictionaryEntry): DictionaryEntry {
        if (entry.columnName != null) {
            // INSERT OR REPLACE works fine when columnName is not null
            Database.getConnection().use { conn ->
                conn.prepareStatement(
                    """INSERT OR REPLACE INTO dictionary (project_id, table_name, column_name, description, data_standard, domain, example, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))"""
                ).use { stmt ->
                    stmt.setInt(1, entry.projectId)
                    stmt.setString(2, entry.tableName)
                    stmt.setString(3, entry.columnName)
                    stmt.setString(4, entry.description)
                    stmt.setString(5, entry.dataStandard)
                    stmt.setString(6, entry.domain)
                    stmt.setString(7, entry.example)
                    stmt.executeUpdate()
                }
                conn.prepareStatement(
                    "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE id = last_insert_rowid()"
                ).use { stmt ->
                    val rs = stmt.executeQuery()
                    rs.next()
                    return rowToEntry(rs)
                }
            }
        } else {
            // columnName IS NULL — SQLite UNIQUE doesn't treat two NULLs as equal,
            // so we need to SELECT first, then INSERT or UPDATE manually
            val existing = findByTableAndColumn(entry.projectId, entry.tableName, null)
            return if (existing != null) {
                Database.getConnection().use { conn ->
                    conn.prepareStatement(
                        """UPDATE dictionary SET description = ?, data_standard = ?, domain = ?, example = ?, updated_at = datetime('now')
                           WHERE id = ?"""
                    ).use { stmt ->
                        stmt.setString(1, entry.description)
                        stmt.setString(2, entry.dataStandard)
                        stmt.setString(3, entry.domain)
                        stmt.setString(4, entry.example)
                        stmt.setInt(5, existing.id!!)
                        stmt.executeUpdate()
                    }
                    conn.prepareStatement(
                        "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE id = ?"
                    ).use { stmt ->
                        stmt.setInt(1, existing.id!!)
                        val rs = stmt.executeQuery()
                        rs.next()
                        rowToEntry(rs)
                    }
                }
            } else {
                Database.getConnection().use { conn ->
                    conn.prepareStatement(
                        """INSERT INTO dictionary (project_id, table_name, column_name, description, data_standard, domain, example, updated_at)
                           VALUES (?, ?, NULL, ?, ?, ?, ?, datetime('now'))"""
                    ).use { stmt ->
                        stmt.setInt(1, entry.projectId)
                        stmt.setString(2, entry.tableName)
                        stmt.setString(3, entry.description)
                        stmt.setString(4, entry.dataStandard)
                        stmt.setString(5, entry.domain)
                        stmt.setString(6, entry.example)
                        stmt.executeUpdate()
                    }
                    conn.prepareStatement(
                        "SELECT id, project_id, table_name, column_name, description, data_standard, domain, example, updated_at FROM dictionary WHERE id = last_insert_rowid()"
                    ).use { stmt ->
                        val rs = stmt.executeQuery()
                        rs.next()
                        rowToEntry(rs)
                    }
                }
            }
        }
    }

    fun delete(id: Int, projectId: Int): Boolean {
        Database.getConnection().use { conn ->
            conn.prepareStatement("DELETE FROM dictionary WHERE id = ? AND project_id = ?").use { stmt ->
                stmt.setInt(1, id)
                stmt.setInt(2, projectId)
                return stmt.executeUpdate() > 0
            }
        }
    }

    private fun rowToEntry(rs: java.sql.ResultSet) = DictionaryEntry(
        id = rs.getInt("id"),
        projectId = rs.getInt("project_id"),
        tableName = rs.getString("table_name"),
        columnName = rs.getString("column_name"),
        description = rs.getString("description"),
        dataStandard = rs.getString("data_standard"),
        domain = rs.getString("domain"),
        example = rs.getString("example"),
        updatedAt = rs.getString("updated_at")
    )
}
