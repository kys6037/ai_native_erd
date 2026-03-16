package com.erd.api

import com.erd.exception.BadRequestException
import com.erd.exception.NotFoundException
import com.erd.model.DbConnectionRequest
import com.erd.model.ErdData
import com.erd.model.ErdTable
import com.erd.model.ErdRelationship
import com.erd.model.ColumnMetadata
import com.erd.model.ForeignKeyRef
import com.erd.repository.ConnectionRepository
import com.erd.repository.ConnectionCredentials
import io.javalin.Javalin
import java.sql.DriverManager
import java.util.UUID

private fun buildJdbcUrl(type: String, host: String?, port: Int?, database: String?, ssl: Boolean): String {
    val h = host ?: "localhost"
    val db = database ?: ""
    return when (type.lowercase()) {
        "mysql" -> {
            val p = port ?: 3306
            val sslVal = if (ssl) "true" else "false"
            "jdbc:mysql://$h:$p/$db?useSSL=$sslVal&allowPublicKeyRetrieval=true&serverTimezone=UTC&connectTimeout=5000&socketTimeout=10000"
        }
        "postgresql" -> {
            val p = port ?: 5432
            val sslMode = if (ssl) "require" else "disable"
            "jdbc:postgresql://$h:$p/$db?sslmode=$sslMode&connectTimeout=5&socketTimeout=10"
        }
        "mssql" -> {
            val p = port ?: 1433
            val encrypt = if (ssl) "true" else "false"
            "jdbc:sqlserver://$h:$p;databaseName=$db;encrypt=$encrypt;loginTimeout=5;trustServerCertificate=true"
        }
        else -> throw BadRequestException("Unsupported DB type: $type. Supported: mysql, postgresql, mssql")
    }
}

private fun importSchema(creds: ConnectionCredentials): ErdData {
    val url = buildJdbcUrl(creds.type, creds.host, creds.port, creds.database, creds.ssl)
    DriverManager.getConnection(url, creds.username, creds.password).use { conn ->
        val meta = conn.metaData
        val catalog = if (creds.type.lowercase() == "mysql") creds.database else null
        val schemaPattern = when (creds.type.lowercase()) {
            "postgresql" -> "public"
            "mssql" -> "dbo"
            else -> null
        }

        val tables = mutableListOf<ErdTable>()
        val relationships = mutableListOf<ErdRelationship>()

        // Get all tables
        meta.getTables(catalog, schemaPattern, "%", arrayOf("TABLE")).use { tableRs ->
            var col = 0
            var xOffset = 50.0
            var yOffset = 50.0

            while (tableRs.next()) {
                val tableName = tableRs.getString("TABLE_NAME") ?: continue
                val tableSchema = tableRs.getString("TABLE_SCHEM")

                // Get PKs
                val pkSet = mutableSetOf<String>()
                try {
                    meta.getPrimaryKeys(catalog, tableSchema, tableName).use { pkRs ->
                        while (pkRs.next()) pkSet.add(pkRs.getString("COLUMN_NAME"))
                    }
                } catch (_: Exception) {}

                // Get columns
                val columns = mutableListOf<ColumnMetadata>()
                try {
                    meta.getColumns(catalog, tableSchema, tableName, "%").use { colRs ->
                        while (colRs.next()) {
                            val colName = colRs.getString("COLUMN_NAME") ?: continue
                            val typeName = colRs.getString("TYPE_NAME") ?: "VARCHAR"
                            val nullable = colRs.getString("IS_NULLABLE") == "YES"
                            val autoInc = try { colRs.getString("IS_AUTOINCREMENT") == "YES" } catch (_: Exception) { false }
                            val colSize = colRs.getInt("COLUMN_SIZE").takeIf { it > 0 && it < 65535 }
                            val remarks = try { colRs.getString("REMARKS") } catch (_: Exception) { null }

                            columns.add(ColumnMetadata(
                                name = colName,
                                type = typeName.uppercase(),
                                length = colSize,
                                nullable = nullable,
                                primaryKey = colName in pkSet,
                                autoIncrement = autoInc,
                                comment = remarks?.takeIf { it.isNotBlank() }
                            ))
                        }
                    }
                } catch (_: Exception) {}

                tables.add(ErdTable(
                    id = UUID.randomUUID().toString(),
                    name = tableName,
                    schema = tableSchema,
                    columns = columns,
                    x = xOffset,
                    y = yOffset
                ))

                col++
                xOffset += 340.0
                if (col % 4 == 0) {
                    xOffset = 50.0
                    yOffset += 280.0
                }
            }
        }

        // Build table name→id map
        val tableMap = tables.associateBy { it.name }

        // Get FK relationships
        for (table in tables) {
            try {
                meta.getImportedKeys(catalog, schemaPattern, table.name).use { fkRs ->
                    while (fkRs.next()) {
                        val fkColName = fkRs.getString("FKCOLUMN_NAME") ?: continue
                        val pkTableName = fkRs.getString("PKTABLE_NAME") ?: continue
                        val pkColName = fkRs.getString("PKCOLUMN_NAME") ?: continue
                        val constraintName = try { fkRs.getString("FK_NAME") } catch (_: Exception) { null }
                        val pkTable = tableMap[pkTableName] ?: continue

                        relationships.add(ErdRelationship(
                            id = UUID.randomUUID().toString(),
                            sourceTableId = table.id,
                            sourceColumnName = fkColName,
                            targetTableId = pkTable.id,
                            targetColumnName = pkColName,
                            type = "one-to-many",
                            constraintName = constraintName
                        ))
                    }
                }
            } catch (_: Exception) {}
        }

        // Post-process: set FK refs in columns
        val updatedTables = tables.map { table ->
            val updatedColumns = table.columns.map { col ->
                val fkRel = relationships.find { it.sourceTableId == table.id && it.sourceColumnName == col.name }
                if (fkRel != null) {
                    val pkTable = tables.find { it.id == fkRel.targetTableId }
                    if (pkTable != null) {
                        col.copy(foreignKey = ForeignKeyRef(
                            referencedTable = pkTable.name,
                            referencedColumn = fkRel.targetColumnName,
                            constraintName = fkRel.constraintName
                        ))
                    } else col
                } else col
            }
            table.copy(columns = updatedColumns)
        }

        return ErdData(tables = updatedTables, relationships = relationships)
    }
}

fun registerConnectionRoutes(app: Javalin, connectionRepo: ConnectionRepository) {
    app.get("/api/connections") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        ctx.json(connectionRepo.findAll(userId))
    }

    app.post("/api/connections") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val req = ctx.bodyAsClass(DbConnectionRequest::class.java)
        if (req.name.isBlank()) throw BadRequestException("name is required")
        if (req.type.isBlank()) throw BadRequestException("type is required")
        val conn = connectionRepo.create(userId, req)
        ctx.status(201).json(conn)
    }

    app.put("/api/connections/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull() ?: throw NotFoundException("Connection not found")
        val req = ctx.bodyAsClass(DbConnectionRequest::class.java)
        val conn = connectionRepo.update(id, userId, req) ?: throw NotFoundException("Connection not found")
        ctx.json(conn)
    }

    app.delete("/api/connections/{id}") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull() ?: throw NotFoundException("Connection not found")
        connectionRepo.delete(id, userId)
        ctx.status(204)
    }

    app.post("/api/connections/{id}/test") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull() ?: throw NotFoundException("Connection not found")
        val creds = connectionRepo.findCredentials(id, userId) ?: throw NotFoundException("Connection not found")
        try {
            val url = buildJdbcUrl(creds.type, creds.host, creds.port, creds.database, creds.ssl)
            DriverManager.getConnection(url, creds.username, creds.password).use { /* test only */ }
            ctx.json(mapOf("success" to true, "message" to "Connection successful"))
        } catch (e: Exception) {
            ctx.json(mapOf("success" to false, "message" to (e.message ?: "Connection failed")))
        }
    }

    app.post("/api/connections/{id}/import") { ctx ->
        val userId = ctx.attribute<Int>("userId")!!
        val id = ctx.pathParam("id").toIntOrNull() ?: throw NotFoundException("Connection not found")
        val creds = connectionRepo.findCredentials(id, userId) ?: throw NotFoundException("Connection not found")
        try {
            ctx.json(importSchema(creds))
        } catch (e: Exception) {
            throw BadRequestException("Import failed: ${e.message ?: "Unknown error"}")
        }
    }
}
