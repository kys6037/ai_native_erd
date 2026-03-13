package com.erd

import com.erd.model.*
import com.erd.service.SchemaDiffer
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class SchemaDifferTest {

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun col(name: String, type: String = "INT", nullable: Boolean = true) =
        ColumnMetadata(name = name, type = type, nullable = nullable)

    private fun table(id: String, name: String, vararg columns: ColumnMetadata) =
        ErdTable(id = id, name = name, columns = columns.toList())

    private fun rel(
        id: String,
        srcTableId: String, srcCol: String,
        tgtTableId: String, tgtCol: String,
        constraintName: String? = null
    ) = ErdRelationship(
        id = id,
        sourceTableId = srcTableId,
        sourceColumnName = srcCol,
        targetTableId = tgtTableId,
        targetColumnName = tgtCol,
        constraintName = constraintName
    )

    private fun erd(vararg tables: ErdTable, relationships: List<ErdRelationship> = emptyList()) =
        ErdData(tables = tables.toList(), relationships = relationships)

    // -------------------------------------------------------------------------
    // Identical ERDs → all diff lists empty
    // -------------------------------------------------------------------------

    @Test
    fun `identical ERDs produce empty diff`() {
        val erdData = erd(
            table("t1", "users", col("id", "INT"), col("email", "VARCHAR"))
        )
        val diff = SchemaDiffer.diff(erdData, erdData)
        assertTrue(diff.addedTables.isEmpty())
        assertTrue(diff.removedTables.isEmpty())
        assertTrue(diff.modifiedTables.isEmpty())
        assertTrue(diff.addedRelationships.isEmpty())
        assertTrue(diff.removedRelationships.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Table added
    // -------------------------------------------------------------------------

    @Test
    fun `table added appears in addedTables`() {
        val from = erd(table("t1", "users", col("id")))
        val to = erd(
            table("t1", "users", col("id")),
            table("t2", "orders", col("id"))
        )
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.addedTables.size)
        assertEquals("orders", diff.addedTables[0].name)
        assertTrue(diff.removedTables.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Table removed
    // -------------------------------------------------------------------------

    @Test
    fun `table removed appears in removedTables`() {
        val from = erd(
            table("t1", "users", col("id")),
            table("t2", "orders", col("id"))
        )
        val to = erd(table("t1", "users", col("id")))
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.removedTables.size)
        assertEquals("orders", diff.removedTables[0].name)
        assertTrue(diff.addedTables.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Column added
    // -------------------------------------------------------------------------

    @Test
    fun `column added appears in modifiedTables addedColumns`() {
        val from = erd(table("t1", "users", col("id")))
        val to = erd(table("t1", "users", col("id"), col("email", "VARCHAR")))
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.modifiedTables.size)
        val tableDiff = diff.modifiedTables[0]
        assertEquals("users", tableDiff.tableName)
        assertEquals(1, tableDiff.addedColumns.size)
        assertEquals("email", tableDiff.addedColumns[0].name)
        assertTrue(tableDiff.removedColumns.isEmpty())
        assertTrue(tableDiff.modifiedColumns.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Column removed
    // -------------------------------------------------------------------------

    @Test
    fun `column removed appears in modifiedTables removedColumns`() {
        val from = erd(table("t1", "users", col("id"), col("email", "VARCHAR")))
        val to = erd(table("t1", "users", col("id")))
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.modifiedTables.size)
        val tableDiff = diff.modifiedTables[0]
        assertEquals(1, tableDiff.removedColumns.size)
        assertEquals("email", tableDiff.removedColumns[0].name)
        assertTrue(tableDiff.addedColumns.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Column type changed
    // -------------------------------------------------------------------------

    @Test
    fun `column type changed appears in modifiedTables modifiedColumns`() {
        val from = erd(table("t1", "users", col("id", "INT")))
        val to = erd(table("t1", "users", col("id", "BIGINT")))
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.modifiedTables.size)
        val tableDiff = diff.modifiedTables[0]
        assertEquals(1, tableDiff.modifiedColumns.size)
        val colDiff = tableDiff.modifiedColumns[0]
        assertEquals("id", colDiff.columnName)
        assertEquals("INT", colDiff.before.type)
        assertEquals("BIGINT", colDiff.after.type)
    }

    // -------------------------------------------------------------------------
    // Unchanged tables NOT in modifiedTables
    // -------------------------------------------------------------------------

    @Test
    fun `unchanged table not in modifiedTables`() {
        val from = erd(
            table("t1", "users", col("id"), col("email", "VARCHAR")),
            table("t2", "orders", col("id"))
        )
        // Only orders changes
        val to = erd(
            table("t1", "users", col("id"), col("email", "VARCHAR")),
            table("t2", "orders", col("id"), col("total", "DECIMAL"))
        )
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.modifiedTables.size)
        assertEquals("orders", diff.modifiedTables[0].tableName)
    }

    // -------------------------------------------------------------------------
    // Relationship added
    // -------------------------------------------------------------------------

    @Test
    fun `relationship added appears in addedRelationships`() {
        val from = erd(
            table("t1", "users", col("id")),
            table("t2", "orders", col("id"), col("user_id"))
        )
        val newRel = rel("r1", "t2", "user_id", "t1", "id", constraintName = "fk_orders_user")
        val to = erd(
            table("t1", "users", col("id")),
            table("t2", "orders", col("id"), col("user_id")),
            relationships = listOf(newRel)
        )
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.addedRelationships.size)
        assertEquals("fk_orders_user", diff.addedRelationships[0].constraintName)
        assertTrue(diff.removedRelationships.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Relationship removed
    // -------------------------------------------------------------------------

    @Test
    fun `relationship removed appears in removedRelationships`() {
        val existingRel = rel("r1", "t2", "user_id", "t1", "id", constraintName = "fk_orders_user")
        val from = erd(
            table("t1", "users", col("id")),
            table("t2", "orders", col("id"), col("user_id")),
            relationships = listOf(existingRel)
        )
        val to = erd(
            table("t1", "users", col("id")),
            table("t2", "orders", col("id"), col("user_id"))
        )
        val diff = SchemaDiffer.diff(from, to)
        assertEquals(1, diff.removedRelationships.size)
        assertEquals("fk_orders_user", diff.removedRelationships[0].constraintName)
        assertTrue(diff.addedRelationships.isEmpty())
    }

    // -------------------------------------------------------------------------
    // Table name matching is case-insensitive
    // -------------------------------------------------------------------------

    @Test
    fun `table matching is case-insensitive`() {
        val from = erd(table("t1", "Users", col("id")))
        val to = erd(table("t1", "users", col("id")))
        val diff = SchemaDiffer.diff(from, to)
        // Should not see "users" as added and "Users" as removed
        assertTrue(diff.addedTables.isEmpty(), "No tables should be added for case-only rename")
        assertTrue(diff.removedTables.isEmpty(), "No tables should be removed for case-only rename")
    }

    // -------------------------------------------------------------------------
    // No changes → no modifiedTables entry
    // -------------------------------------------------------------------------

    @Test
    fun `table with no column changes not in modifiedTables`() {
        val erdData = erd(table("t1", "users", col("id", "INT", nullable = false)))
        val diff = SchemaDiffer.diff(erdData, erdData)
        assertTrue(diff.modifiedTables.isEmpty())
    }
}
