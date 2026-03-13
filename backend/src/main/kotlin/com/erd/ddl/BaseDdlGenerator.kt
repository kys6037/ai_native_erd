package com.erd.ddl

import com.erd.model.ColumnMetadata
import com.erd.model.ErdData
import com.erd.model.ErdRelationship
import com.erd.model.ErdTable
import com.erd.model.IndexMetadata

abstract class BaseDdlGenerator : DdlGenerator {

    /** Quote an identifier for the target dialect */
    abstract override fun quote(name: String): String

    /** SQL type for autoincrement integer primary key column */
    abstract fun autoIncrementSuffix(): String

    /** Whether the dialect uses a SERIAL / BIGSERIAL type instead of a suffix */
    open fun autoIncrementType(col: ColumnMetadata): String? = null

    override fun generate(erdData: ErdData): String {
        val parts = mutableListOf<String>()

        // 1. CREATE TABLE statements (columns + PK, no FK constraints)
        for (table in erdData.tables) {
            parts.add(buildCreateTable(table))
        }

        // 2. ALTER TABLE ADD CONSTRAINT for FK relationships
        for (rel in erdData.relationships) {
            val sourceTable = erdData.tables.find { it.id == rel.sourceTableId } ?: continue
            val targetTable = erdData.tables.find { it.id == rel.targetTableId } ?: continue
            parts.add(buildAddForeignKey(sourceTable, targetTable, rel))
        }

        // 3. CREATE INDEX for table indexes
        for (table in erdData.tables) {
            for (idx in table.indexes) {
                parts.add(buildCreateIndex(table, idx))
            }
        }

        return parts.joinToString("\n\n")
    }

    private fun buildCreateTable(table: ErdTable): String {
        val sb = StringBuilder()
        val tableName = quote(table.name)
        sb.appendLine("CREATE TABLE $tableName (")

        val columnLines = mutableListOf<String>()
        val pkColumns = table.columns.filter { it.primaryKey }.map { it.name }

        for (col in table.columns) {
            columnLines.add("  " + buildColumnDef(col))
        }

        // PRIMARY KEY constraint
        if (pkColumns.isNotEmpty()) {
            val pkCols = pkColumns.joinToString(", ") { quote(it) }
            columnLines.add("  PRIMARY KEY ($pkCols)")
        }

        sb.append(columnLines.joinToString(",\n"))
        sb.appendLine()
        sb.append(");")
        return sb.toString()
    }

    protected open fun buildColumnDef(col: ColumnMetadata): String {
        val sb = StringBuilder()
        sb.append(quote(col.name))
        sb.append(" ")

        val aiType = autoIncrementType(col)
        if (col.autoIncrement && aiType != null) {
            sb.append(aiType)
        } else {
            sb.append(columnType(col))
            if (col.autoIncrement) {
                sb.append(" ")
                sb.append(autoIncrementSuffix())
            }
        }

        if (!col.nullable) {
            sb.append(" NOT NULL")
        }

        if (col.unique == true && !col.primaryKey) {
            sb.append(" UNIQUE")
        }

        if (col.defaultValue != null) {
            sb.append(" DEFAULT '${col.defaultValue}'")
        }

        return sb.toString()
    }

    private fun buildAddForeignKey(sourceTable: ErdTable, targetTable: ErdTable, rel: ErdRelationship): String {
        // Convention: sourceTable = child (FK side), targetTable = parent (referenced side)
        val constraintName = rel.constraintName
            ?: "fk_${sourceTable.name}_${rel.sourceColumnName}"
        return "ALTER TABLE ${quote(sourceTable.name)} " +
                "ADD CONSTRAINT ${quote(constraintName)} " +
                "FOREIGN KEY (${quote(rel.sourceColumnName)}) " +
                "REFERENCES ${quote(targetTable.name)} (${quote(rel.targetColumnName)});"
    }

    private fun buildCreateIndex(table: ErdTable, idx: IndexMetadata): String {
        val unique = if (idx.unique) "UNIQUE " else ""
        val cols = idx.columns.joinToString(", ") { quote(it) }
        return "CREATE ${unique}INDEX ${quote(idx.name)} ON ${quote(table.name)} ($cols);"
    }
}
