package com.erd.repository

import com.erd.config.Database
import com.erd.model.DbConnectionRequest
import com.erd.model.DbConnectionResponse

class ConnectionRepository {

    fun findAll(userId: Int): List<DbConnectionResponse> {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, name, type, host, port, database, username, ssl FROM db_connections WHERE user_id = ? ORDER BY created_at DESC"
            ).use { stmt ->
                stmt.setInt(1, userId)
                val rs = stmt.executeQuery()
                val list = mutableListOf<DbConnectionResponse>()
                while (rs.next()) {
                    list.add(
                        DbConnectionResponse(
                            id = rs.getInt("id"),
                            name = rs.getString("name"),
                            type = rs.getString("type"),
                            host = rs.getString("host"),
                            port = rs.getObject("port") as? Int,
                            database = rs.getString("database"),
                            username = rs.getString("username"),
                            password = null, // Never return password
                            ssl = rs.getInt("ssl") == 1
                        )
                    )
                }
                return list
            }
        }
    }

    fun findById(id: Int, userId: Int): DbConnectionResponse? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "SELECT id, name, type, host, port, database, username, ssl FROM db_connections WHERE id = ? AND user_id = ?"
            ).use { stmt ->
                stmt.setInt(1, id)
                stmt.setInt(2, userId)
                val rs = stmt.executeQuery()
                if (!rs.next()) return null
                return DbConnectionResponse(
                    id = rs.getInt("id"),
                    name = rs.getString("name"),
                    type = rs.getString("type"),
                    host = rs.getString("host"),
                    port = rs.getObject("port") as? Int,
                    database = rs.getString("database"),
                    username = rs.getString("username"),
                    password = null, // Never return password
                    ssl = rs.getInt("ssl") == 1
                )
            }
        }
    }

    fun create(userId: Int, req: DbConnectionRequest): DbConnectionResponse {
        // Note: password is stored as-is (no encryption for simplicity)
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                "INSERT INTO db_connections (user_id, name, type, host, port, database, username, password, ssl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            ).use { stmt ->
                stmt.setInt(1, userId)
                stmt.setString(2, req.name)
                stmt.setString(3, req.type)
                stmt.setString(4, req.host)
                if (req.port != null) stmt.setInt(5, req.port) else stmt.setNull(5, java.sql.Types.INTEGER)
                stmt.setString(6, req.database)
                stmt.setString(7, req.username)
                stmt.setString(8, req.password)
                stmt.setInt(9, if (req.ssl) 1 else 0)
                stmt.executeUpdate()
            }
            conn.prepareStatement(
                "SELECT id, name, type, host, port, database, username, ssl FROM db_connections WHERE id = last_insert_rowid()"
            ).use { stmt ->
                val rs = stmt.executeQuery()
                rs.next()
                return DbConnectionResponse(
                    id = rs.getInt("id"),
                    name = rs.getString("name"),
                    type = rs.getString("type"),
                    host = rs.getString("host"),
                    port = rs.getObject("port") as? Int,
                    database = rs.getString("database"),
                    username = rs.getString("username"),
                    password = null,
                    ssl = rs.getInt("ssl") == 1
                )
            }
        }
    }

    fun update(id: Int, userId: Int, req: DbConnectionRequest): DbConnectionResponse? {
        Database.getConnection().use { conn ->
            conn.prepareStatement(
                """UPDATE db_connections SET name = ?, type = ?, host = ?, port = ?, database = ?, username = ?, password = ?, ssl = ?
                   WHERE id = ? AND user_id = ?"""
            ).use { stmt ->
                stmt.setString(1, req.name)
                stmt.setString(2, req.type)
                stmt.setString(3, req.host)
                if (req.port != null) stmt.setInt(4, req.port) else stmt.setNull(4, java.sql.Types.INTEGER)
                stmt.setString(5, req.database)
                stmt.setString(6, req.username)
                stmt.setString(7, req.password)
                stmt.setInt(8, if (req.ssl) 1 else 0)
                stmt.setInt(9, id)
                stmt.setInt(10, userId)
                val rows = stmt.executeUpdate()
                if (rows == 0) return null
            }
        }
        return findById(id, userId)
    }

    fun delete(id: Int, userId: Int): Boolean {
        Database.getConnection().use { conn ->
            conn.prepareStatement("DELETE FROM db_connections WHERE id = ? AND user_id = ?").use { stmt ->
                stmt.setInt(1, id)
                stmt.setInt(2, userId)
                return stmt.executeUpdate() > 0
            }
        }
    }
}
