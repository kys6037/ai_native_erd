package com.erd.model

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ForeignKeyRef(
    val referencedTable: String,
    val referencedColumn: String,
    val constraintName: String? = null
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ColumnMetadata(
    val name: String,
    val type: String,
    val length: Int? = null,
    val precision: Int? = null,
    val scale: Int? = null,
    val nullable: Boolean = true,
    val primaryKey: Boolean = false,
    val autoIncrement: Boolean = false,
    val unique: Boolean? = null,
    val defaultValue: String? = null,
    val comment: String? = null,
    val foreignKey: ForeignKeyRef? = null
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class IndexMetadata(
    val name: String,
    val columns: List<String>,
    val unique: Boolean = false
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ErdTable(
    val id: String,
    val name: String,
    val schema: String? = null,
    val columns: List<ColumnMetadata> = emptyList(),
    val indexes: List<IndexMetadata> = emptyList(),
    val x: Double = 0.0,
    val y: Double = 0.0,
    val color: String = "#6366f1"
)

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ErdRelationship(
    val id: String,
    val sourceTableId: String,
    val sourceColumnName: String,
    val targetTableId: String,
    val targetColumnName: String,
    val type: String = "one-to-many",
    val constraintName: String? = null
)

data class ErdData(
    val tables: List<ErdTable> = emptyList(),
    val relationships: List<ErdRelationship> = emptyList()
)
