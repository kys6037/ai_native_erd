package com.erd.ddl

import com.erd.model.ColumnMetadata

class MySqlDdlGenerator : BaseDdlGenerator() {

    override fun quote(name: String): String = "`$name`"

    override fun autoIncrementSuffix(): String = "AUTO_INCREMENT"

    override fun columnType(col: ColumnMetadata): String = when (col.type.uppercase()) {
        "INT", "INTEGER" -> "INT"
        "BIGINT" -> "BIGINT"
        "VARCHAR" -> "VARCHAR(${col.length ?: 255})"
        "TEXT" -> "TEXT"
        "BOOLEAN", "BOOL" -> "TINYINT(1)"
        "DECIMAL", "NUMERIC" -> "DECIMAL(${col.precision ?: 10},${col.scale ?: 2})"
        "TIMESTAMP" -> "DATETIME"
        "DATE" -> "DATE"
        "UUID" -> "CHAR(36)"
        "JSON" -> "JSON"
        "FLOAT" -> "FLOAT"
        "DOUBLE" -> "DOUBLE"
        else -> col.type.uppercase()
    }
}
