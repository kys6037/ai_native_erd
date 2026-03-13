package com.erd.ddl

import com.erd.model.ColumnMetadata
import com.erd.model.ErdData
import com.erd.model.ErdRelationship
import com.erd.model.ErdTable
import com.erd.model.ForeignKeyRef
import java.util.UUID

data class ParseResult(val erdData: ErdData, val warnings: List<String>)

object DdlParser {

    // Matches: CREATE TABLE [IF NOT EXISTS] `name` or "name" or [name] or name
    private val CREATE_TABLE_REGEX = Regex(
        """(?i)CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"\[]?(\w+)[`"\]]?)\s*\(([^;]+)\)""",
        RegexOption.DOT_MATCHES_ALL
    )

    private val IDENTIFIER_REGEX = Regex("""[`"\[]?(\w+)[`"\]]?""")

    fun parse(sql: String): ParseResult {
        val warnings = mutableListOf<String>()
        val tables = mutableListOf<ErdTable>()
        val relationships = mutableListOf<ErdRelationship>()

        // Track table name -> id mapping for FK resolution
        val tableIdByName = mutableMapOf<String, String>()

        val matches = CREATE_TABLE_REGEX.findAll(sql)
        var tableIndex = 0

        for (match in matches) {
            try {
                val tableName = match.groupValues[1]
                val body = match.groupValues[2]

                val tableId = UUID.randomUUID().toString()
                val x = 50.0 + tableIndex * 250.0
                val y = 50.0

                val columns = mutableListOf<ColumnMetadata>()
                val pkColumns = mutableSetOf<String>()
                val fkRefs = mutableListOf<Triple<String, String, String>>() // colName, refTable, refCol

                // Split body into lines/clauses
                val clauses = splitClauses(body)

                for (clause in clauses) {
                    val trimmed = clause.trim()
                    when {
                        trimmed.isBlank() -> {}
                        trimmed.uppercase().startsWith("PRIMARY KEY") -> {
                            // PRIMARY KEY (col1, col2)
                            val colList = extractParenContent(trimmed)
                            colList?.split(",")?.forEach { c ->
                                pkColumns.add(extractIdentifier(c.trim()))
                            }
                        }
                        trimmed.uppercase().startsWith("FOREIGN KEY") -> {
                            // FOREIGN KEY (col) REFERENCES table(col)
                            parseForeignKeyClause(trimmed)?.let { (col, refTable, refCol) ->
                                fkRefs.add(Triple(col, refTable, refCol))
                            }
                        }
                        trimmed.uppercase().startsWith("CONSTRAINT") -> {
                            // CONSTRAINT name PRIMARY KEY (...) or FOREIGN KEY (...)
                            val upperTrimmed = trimmed.uppercase()
                            if (upperTrimmed.contains("PRIMARY KEY")) {
                                val colList = extractParenContent(trimmed)
                                colList?.split(",")?.forEach { c ->
                                    pkColumns.add(extractIdentifier(c.trim()))
                                }
                            } else if (upperTrimmed.contains("FOREIGN KEY")) {
                                parseForeignKeyClause(trimmed)?.let { (col, refTable, refCol) ->
                                    fkRefs.add(Triple(col, refTable, refCol))
                                }
                            }
                        }
                        trimmed.uppercase().startsWith("KEY") ||
                        trimmed.uppercase().startsWith("INDEX") ||
                        trimmed.uppercase().startsWith("UNIQUE KEY") -> {
                            // Skip index definitions inside CREATE TABLE
                        }
                        else -> {
                            // Column definition
                            parseColumn(trimmed)?.let { columns.add(it) }
                                ?: warnings.add("Could not parse column definition in table '$tableName': $trimmed")
                        }
                    }
                }

                // Mark primary key columns
                val finalColumns = columns.map { col ->
                    if (col.name in pkColumns) col.copy(primaryKey = true) else col
                }

                // Store FK refs with table id for later relationship building
                tableIdByName[tableName.lowercase()] = tableId

                tables.add(
                    ErdTable(
                        id = tableId,
                        name = tableName,
                        columns = finalColumns,
                        x = x,
                        y = y
                    )
                )

                // Store FK info temporarily as metadata on columns
                for ((colName, refTable, refCol) in fkRefs) {
                    val relId = UUID.randomUUID().toString()
                    // We'll resolve these after all tables are parsed
                    relationships.add(
                        ErdRelationship(
                            id = relId,
                            sourceTableId = tableId,
                            sourceColumnName = colName,
                            targetTableId = refTable, // temporarily store table name
                            targetColumnName = refCol
                        )
                    )
                }

                tableIndex++
            } catch (e: Exception) {
                warnings.add("Failed to parse CREATE TABLE statement: ${e.message}")
            }
        }

        // Resolve FK target table names to IDs
        val resolvedRelationships = relationships.map { rel ->
            val targetId = tableIdByName[rel.targetTableId.lowercase()]
            if (targetId != null) {
                rel.copy(targetTableId = targetId)
            } else {
                warnings.add("Could not resolve FK target table '${rel.targetTableId}'")
                rel
            }
        }

        return ParseResult(ErdData(tables, resolvedRelationships), warnings)
    }

    private fun splitClauses(body: String): List<String> {
        // Split on commas but respect nested parentheses
        val clauses = mutableListOf<String>()
        var depth = 0
        val current = StringBuilder()
        for (ch in body) {
            when (ch) {
                '(' -> { depth++; current.append(ch) }
                ')' -> { depth--; current.append(ch) }
                ',' -> {
                    if (depth == 0) {
                        clauses.add(current.toString())
                        current.clear()
                    } else {
                        current.append(ch)
                    }
                }
                else -> current.append(ch)
            }
        }
        if (current.isNotBlank()) clauses.add(current.toString())
        return clauses
    }

    private fun extractParenContent(s: String): String? {
        val start = s.indexOf('(')
        val end = s.lastIndexOf(')')
        if (start < 0 || end < 0 || end <= start) return null
        return s.substring(start + 1, end)
    }

    private fun extractIdentifier(s: String): String {
        val match = IDENTIFIER_REGEX.find(s)
        return match?.groupValues?.get(1) ?: s
    }

    private fun parseForeignKeyClause(clause: String): Triple<String, String, String>? {
        // FOREIGN KEY (`col`) REFERENCES `table` (`refcol`)
        val fkColMatch = Regex("""(?i)FOREIGN\s+KEY\s*\(([^)]+)\)""").find(clause) ?: return null
        val refMatch = Regex("""(?i)REFERENCES\s+[`"\[]?(\w+)[`"\]]?\s*\(([^)]+)\)""").find(clause) ?: return null
        val col = extractIdentifier(fkColMatch.groupValues[1].trim())
        val refTable = refMatch.groupValues[1]
        val refCol = extractIdentifier(refMatch.groupValues[2].trim())
        return Triple(col, refTable, refCol)
    }

    private fun parseColumn(clause: String): ColumnMetadata? {
        // Skip if it starts with a constraint keyword
        val upper = clause.trim().uppercase()
        if (upper.startsWith("PRIMARY") || upper.startsWith("UNIQUE") ||
            upper.startsWith("INDEX") || upper.startsWith("KEY") ||
            upper.startsWith("CHECK") || upper.startsWith("CONSTRAINT")) {
            return null
        }

        // Column: `name` TYPE [(len)] [NOT NULL] [DEFAULT ...] [AUTO_INCREMENT] ...
        val colNameMatch = Regex("""^[`"\[]?(\w+)[`"\]]?\s+(\S+)""").find(clause.trim()) ?: return null
        val colName = colNameMatch.groupValues[1]
        val rawType = colNameMatch.groupValues[2]

        val (baseType, length, precision, scale) = parseType(rawType, clause)

        val nullable = !clause.uppercase().contains("NOT NULL")
        val autoIncrement = clause.uppercase().let {
            it.contains("AUTO_INCREMENT") || it.contains("AUTOINCREMENT") ||
            it.contains("IDENTITY") || it.contains("SERIAL")
        }
        val primaryKey = clause.uppercase().contains("PRIMARY KEY")

        val defaultMatch = Regex("""(?i)DEFAULT\s+'?([^'\s,]+)'?""").find(clause)
        val defaultValue = defaultMatch?.groupValues?.get(1)

        return ColumnMetadata(
            name = colName,
            type = baseType,
            length = length,
            precision = precision,
            scale = scale,
            nullable = nullable,
            primaryKey = primaryKey,
            autoIncrement = autoIncrement,
            defaultValue = defaultValue
        )
    }

    private data class TypeInfo(val type: String, val length: Int?, val precision: Int?, val scale: Int?)

    private fun parseType(rawType: String, fullClause: String): TypeInfo {
        val typeUpper = rawType.uppercase()
        // Try to find length/precision from rawType or from immediately following parens
        val parenMatch = Regex("""(\w+)\s*\(([^)]+)\)""").find(rawType + " " + fullClause.substringAfter(rawType))
        val baseType: String
        var length: Int? = null
        var precision: Int? = null
        var scale: Int? = null

        if (parenMatch != null) {
            baseType = normalizeType(parenMatch.groupValues[1].uppercase())
            val args = parenMatch.groupValues[2].split(",")
            if (args.size >= 2) {
                precision = args[0].trim().toIntOrNull()
                scale = args[1].trim().toIntOrNull()
            } else {
                length = args[0].trim().toIntOrNull()
            }
        } else {
            baseType = normalizeType(typeUpper.replace(Regex("""[^A-Z0-9 ]"""), "").trim())
        }

        return TypeInfo(baseType, length, precision, scale)
    }

    private fun normalizeType(t: String): String = when {
        t.startsWith("VARCHAR") || t.startsWith("NVARCHAR") || t.startsWith("VARCHAR2") -> "VARCHAR"
        t.startsWith("INT") || t == "INTEGER" -> "INT"
        t == "BIGINT" -> "BIGINT"
        t.startsWith("TINYINT") -> "BOOLEAN"
        t.startsWith("DECIMAL") || t.startsWith("NUMERIC") || t.startsWith("NUMBER") -> "DECIMAL"
        t == "DATETIME" || t.startsWith("TIMESTAMP") -> "TIMESTAMP"
        t == "DATE" -> "DATE"
        t == "TEXT" || t == "CLOB" || t.startsWith("NVARCHAR MAX") -> "TEXT"
        t.startsWith("CHAR") || t == "UNIQUEIDENTIFIER" -> "UUID"
        t == "JSON" || t == "JSONB" -> "JSON"
        t == "FLOAT" || t == "REAL" -> "FLOAT"
        t.startsWith("DOUBLE") || t == "FLOAT53" -> "DOUBLE"
        t == "BOOLEAN" || t == "BOOL" || t == "BIT" -> "BOOLEAN"
        t == "SERIAL" || t == "BIGSERIAL" -> "INT"
        else -> t
    }
}
