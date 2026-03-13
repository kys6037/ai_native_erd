package com.erd.ddl

import com.erd.model.ColumnMetadata

class MsSqlDdlGenerator : BaseDdlGenerator() {

    override fun quote(name: String): String = "[$name]"

    override fun autoIncrementSuffix(): String = "IDENTITY(1,1)"

    override fun columnType(col: ColumnMetadata): String = when (col.type.uppercase()) {
        "INT", "INTEGER" -> "INT"
        "BIGINT" -> "BIGINT"
        "VARCHAR" -> "NVARCHAR(${col.length ?: 255})"
        "TEXT" -> "NVARCHAR(MAX)"
        "BOOLEAN", "BOOL" -> "BIT"
        "DECIMAL", "NUMERIC" -> "DECIMAL(${col.precision ?: 10},${col.scale ?: 2})"
        "TIMESTAMP" -> "DATETIME2"
        "DATE" -> "DATE"
        "UUID" -> "UNIQUEIDENTIFIER"
        "JSON" -> "NVARCHAR(MAX)"
        "FLOAT" -> "FLOAT"
        "DOUBLE" -> "FLOAT(53)"
        else -> col.type.uppercase()
    }
}
