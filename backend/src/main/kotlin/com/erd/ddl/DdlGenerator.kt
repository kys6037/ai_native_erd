package com.erd.ddl

import com.erd.model.ColumnMetadata
import com.erd.model.ErdData

interface DdlGenerator {
    fun generate(erdData: ErdData): String
    fun columnType(col: ColumnMetadata): String
    fun quote(name: String): String
}

fun getDdlGenerator(dialect: String): DdlGenerator = when (dialect.lowercase()) {
    "mysql" -> MySqlDdlGenerator()
    "postgresql" -> PostgreSqlDdlGenerator()
    "oracle" -> OracleDdlGenerator()
    "mssql" -> MsSqlDdlGenerator()
    else -> throw IllegalArgumentException("Unsupported dialect: $dialect")
}
