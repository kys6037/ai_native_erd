package com.erd.service

import com.erd.model.ColumnMetadata
import com.erd.model.ErdData
import com.erd.model.ErdRelationship
import com.erd.model.ErdTable

data class ColumnDiff(
    val columnName: String,
    val before: ColumnMetadata,
    val after: ColumnMetadata
)

data class TableDiff(
    val tableId: String,
    val tableName: String,
    val addedColumns: List<ColumnMetadata>,
    val removedColumns: List<ColumnMetadata>,
    val modifiedColumns: List<ColumnDiff>
)

data class SchemaDiff(
    val addedTables: List<ErdTable>,
    val removedTables: List<ErdTable>,
    val modifiedTables: List<TableDiff>,
    val addedRelationships: List<ErdRelationship>,
    val removedRelationships: List<ErdRelationship>
)

object SchemaDiffer {

    fun diff(from: ErdData, to: ErdData): SchemaDiff {
        // Match tables by name
        val fromTablesByName = from.tables.associateBy { it.name.lowercase() }
        val toTablesByName = to.tables.associateBy { it.name.lowercase() }

        val addedTables = to.tables.filter { it.name.lowercase() !in fromTablesByName }
        val removedTables = from.tables.filter { it.name.lowercase() !in toTablesByName }

        val modifiedTables = mutableListOf<TableDiff>()
        for (toTable in to.tables) {
            val fromTable = fromTablesByName[toTable.name.lowercase()] ?: continue
            val tableDiff = diffTable(fromTable, toTable)
            if (tableDiff.addedColumns.isNotEmpty() ||
                tableDiff.removedColumns.isNotEmpty() ||
                tableDiff.modifiedColumns.isNotEmpty()
            ) {
                modifiedTables.add(tableDiff)
            }
        }

        // Match relationships by constraintName or (sourceTable+sourceColumn+targetTable+targetColumn)
        val fromRelKey = from.relationships.associateBy { relKey(it) }
        val toRelKey = to.relationships.associateBy { relKey(it) }

        val addedRelationships = to.relationships.filter { relKey(it) !in fromRelKey }
        val removedRelationships = from.relationships.filter { relKey(it) !in toRelKey }

        return SchemaDiff(
            addedTables = addedTables,
            removedTables = removedTables,
            modifiedTables = modifiedTables,
            addedRelationships = addedRelationships,
            removedRelationships = removedRelationships
        )
    }

    private fun relKey(rel: ErdRelationship): String {
        return rel.constraintName
            ?: "${rel.sourceTableId}:${rel.sourceColumnName}->${rel.targetTableId}:${rel.targetColumnName}"
    }

    private fun diffTable(from: ErdTable, to: ErdTable): TableDiff {
        val fromColsByName = from.columns.associateBy { it.name.lowercase() }
        val toColsByName = to.columns.associateBy { it.name.lowercase() }

        val addedColumns = to.columns.filter { it.name.lowercase() !in fromColsByName }
        val removedColumns = from.columns.filter { it.name.lowercase() !in toColsByName }

        val modifiedColumns = mutableListOf<ColumnDiff>()
        for (toCol in to.columns) {
            val fromCol = fromColsByName[toCol.name.lowercase()] ?: continue
            if (isColumnChanged(fromCol, toCol)) {
                modifiedColumns.add(ColumnDiff(toCol.name, fromCol, toCol))
            }
        }

        return TableDiff(
            tableId = to.id,
            tableName = to.name,
            addedColumns = addedColumns,
            removedColumns = removedColumns,
            modifiedColumns = modifiedColumns
        )
    }

    private fun isColumnChanged(from: ColumnMetadata, to: ColumnMetadata): Boolean {
        return from.type != to.type ||
                from.length != to.length ||
                from.precision != to.precision ||
                from.scale != to.scale ||
                from.nullable != to.nullable ||
                from.primaryKey != to.primaryKey ||
                from.autoIncrement != to.autoIncrement ||
                from.defaultValue != to.defaultValue
    }
}
