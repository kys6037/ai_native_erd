package com.erd.service

import com.erd.ddl.getDdlGenerator
import com.erd.model.ErdData
import com.erd.model.ErdRelationship
import com.erd.model.ErdTable

object MigrationGenerator {

    fun generate(diff: SchemaDiff, from: ErdData, to: ErdData, dialect: String): String {
        val generator = getDdlGenerator(dialect)
        val parts = mutableListOf<String>()

        // Step 1: DROP FK constraints (removedRelationships + modifiedTables existing FKs)
        val fromTableById = from.tables.associateBy { it.id }
        val toTableById = to.tables.associateBy { it.id }

        for (rel in diff.removedRelationships) {
            val srcTable = fromTableById[rel.sourceTableId] ?: continue
            val constraintName = rel.constraintName ?: "fk_${srcTable.name}_${rel.sourceColumnName}"
            parts.add("ALTER TABLE ${generator.quote(srcTable.name)} DROP FOREIGN KEY ${generator.quote(constraintName)};")
        }

        // Step 2: DROP tables (removedTables)
        // Simple dependency order: drop tables that reference others first
        val orderedRemovals = orderTablesForDrop(diff.removedTables, from)
        for (table in orderedRemovals) {
            parts.add("DROP TABLE ${generator.quote(table.name)};")
        }

        // Step 3: CREATE tables (addedTables) — dependency order (referenced first), no FK constraints
        val orderedAdditions = orderTablesForCreate(diff.addedTables, to)
        for (table in orderedAdditions) {
            // Generate CREATE TABLE without FK constraints
            val erdDataSingle = ErdData(tables = listOf(table), relationships = emptyList())
            val createSql = generator.generate(erdDataSingle).trim()
            parts.add(createSql)
        }

        // Step 4: ALTER TABLE ADD/MODIFY/DROP columns
        for (tableDiff in diff.modifiedTables) {
            // Verify the table exists in the target ERD
            toTableById[tableDiff.tableId]
                ?: to.tables.find { it.name.equals(tableDiff.tableName, ignoreCase = true) }
                ?: continue

            for (col in tableDiff.removedColumns) {
                parts.add("ALTER TABLE ${generator.quote(tableDiff.tableName)} DROP COLUMN ${generator.quote(col.name)};")
            }
            for (col in tableDiff.addedColumns) {
                val colDef = buildColumnDef(generator, col)
                parts.add("ALTER TABLE ${generator.quote(tableDiff.tableName)} ADD COLUMN $colDef;")
            }
            for (colDiff in tableDiff.modifiedColumns) {
                val colDef = buildColumnDef(generator, colDiff.after)
                // MODIFY for MySQL, ALTER COLUMN for others
                val modifyKeyword = if (dialect.lowercase() == "mysql") "MODIFY COLUMN" else "ALTER COLUMN"
                parts.add("ALTER TABLE ${generator.quote(tableDiff.tableName)} $modifyKeyword $colDef;")
            }
        }

        // Step 5: ADD FK constraints (addedRelationships + tables that were added)
        for (rel in diff.addedRelationships) {
            val srcTable = toTableById[rel.sourceTableId] ?: continue
            val tgtTable = toTableById[rel.targetTableId] ?: continue
            val constraintName = rel.constraintName ?: "fk_${srcTable.name}_${rel.sourceColumnName}"
            parts.add(
                "ALTER TABLE ${generator.quote(srcTable.name)} " +
                "ADD CONSTRAINT ${generator.quote(constraintName)} " +
                "FOREIGN KEY (${generator.quote(rel.sourceColumnName)}) " +
                "REFERENCES ${generator.quote(tgtTable.name)} (${generator.quote(rel.targetColumnName)});"
            )
        }

        return parts.joinToString("\n\n")
    }

    private fun buildColumnDef(generator: com.erd.ddl.DdlGenerator, col: com.erd.model.ColumnMetadata): String {
        val sb = StringBuilder()
        sb.append(generator.quote(col.name))
        sb.append(" ")
        sb.append(generator.columnType(col))
        if (!col.nullable) sb.append(" NOT NULL")
        if (col.defaultValue != null) sb.append(" DEFAULT '${col.defaultValue}'")
        return sb.toString()
    }

    private fun orderTablesForDrop(tables: List<ErdTable>, erdData: ErdData): List<ErdTable> {
        // Tables that are referenced by other tables should be dropped last
        // Simple heuristic: sort so referencing tables come before referenced ones
        return tables.sortedByDescending { table ->
            erdData.relationships.count { it.targetTableId == table.id }
        }
    }

    private fun orderTablesForCreate(tables: List<ErdTable>, erdData: ErdData): List<ErdTable> {
        // Referenced tables should be created before referencing tables
        return tables.sortedBy { table ->
            erdData.relationships.count { it.sourceTableId == table.id }
        }
    }
}
