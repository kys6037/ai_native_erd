package com.erd.ddl

import com.erd.model.ColumnMetadata

class PostgreSqlDdlGenerator : BaseDdlGenerator() {

    override fun quote(name: String): String = "\"$name\""

    override fun autoIncrementSuffix(): String = "" // Not used — overridden via autoIncrementType

    override fun autoIncrementType(col: ColumnMetadata): String? {
        if (!col.autoIncrement) return null
        return when (col.type.uppercase()) {
            "BIGINT" -> "BIGSERIAL"
            else -> "SERIAL"
        }
    }

    override fun columnType(col: ColumnMetadata): String = when (col.type.uppercase()) {
        "INT", "INTEGER" -> "INTEGER"
        "BIGINT" -> "BIGINT"
        "VARCHAR" -> "VARCHAR(${col.length ?: 255})"
        "TEXT" -> "TEXT"
        "BOOLEAN", "BOOL" -> "BOOLEAN"
        "DECIMAL", "NUMERIC" -> "DECIMAL(${col.precision ?: 10},${col.scale ?: 2})"
        "TIMESTAMP" -> "TIMESTAMP"
        "DATE" -> "DATE"
        "UUID" -> "UUID"
        "JSON" -> "JSONB"
        "FLOAT" -> "REAL"
        "DOUBLE" -> "DOUBLE PRECISION"
        else -> col.type.uppercase()
    }
}
