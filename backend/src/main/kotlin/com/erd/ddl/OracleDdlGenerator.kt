package com.erd.ddl

import com.erd.model.ColumnMetadata
import com.erd.model.ErdData

class OracleDdlGenerator : BaseDdlGenerator() {

    override fun quote(name: String): String = name.uppercase()

    override fun autoIncrementSuffix(): String = "" // Oracle uses SEQUENCE + TRIGGER

    override fun columnType(col: ColumnMetadata): String = when (col.type.uppercase()) {
        "INT", "INTEGER" -> "NUMBER(10)"
        "BIGINT" -> "NUMBER(19)"
        "VARCHAR" -> "VARCHAR2(${col.length ?: 255})"
        "TEXT" -> "CLOB"
        "BOOLEAN", "BOOL" -> "NUMBER(1)"
        "DECIMAL", "NUMERIC" -> "NUMBER(${col.precision ?: 10},${col.scale ?: 2})"
        "TIMESTAMP" -> "TIMESTAMP"
        "DATE" -> "DATE"
        "UUID" -> "CHAR(36)"
        "JSON" -> "CLOB"
        "FLOAT" -> "FLOAT"
        "DOUBLE" -> "FLOAT(53)"
        else -> col.type.uppercase()
    }

    override fun generate(erdData: ErdData): String {
        val parts = mutableListOf<String>()

        // 1. CREATE TABLE statements
        for (table in erdData.tables) {
            val autoIncrCols = table.columns.filter { it.autoIncrement }

            // Sequence + Trigger for each autoincrement column
            for (col in autoIncrCols) {
                val seqName = "SEQ_${table.name.uppercase()}_${col.name.uppercase()}"
                parts.add("CREATE SEQUENCE $seqName START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;")
            }
        }

        // CREATE TABLE base (from parent)
        val baseSql = super.generate(erdData)
        parts.add(baseSql)

        // Triggers for autoincrement
        for (table in erdData.tables) {
            val autoIncrCols = table.columns.filter { it.autoIncrement }
            for (col in autoIncrCols) {
                val tableName = table.name.uppercase()
                val colName = col.name.uppercase()
                val seqName = "SEQ_${tableName}_${colName}"
                val trigName = "TRG_${tableName}_${colName}"
                parts.add(
                    """CREATE OR REPLACE TRIGGER $trigName
BEFORE INSERT ON $tableName
FOR EACH ROW
BEGIN
  IF :NEW.$colName IS NULL THEN
    SELECT $seqName.NEXTVAL INTO :NEW.$colName FROM DUAL;
  END IF;
END;
/"""
                )
            }
        }

        return parts.joinToString("\n\n")
    }
}
