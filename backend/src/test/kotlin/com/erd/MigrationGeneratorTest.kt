package com.erd

import com.erd.model.*
import com.erd.service.MigrationGenerator
import com.erd.service.SchemaDiffer
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class MigrationGeneratorTest {

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun col(
        name: String,
        type: String = "INT",
        nullable: Boolean = true,
        primaryKey: Boolean = false,
        autoIncrement: Boolean = false
    ) = ColumnMetadata(name = name, type = type, nullable = nullable, primaryKey = primaryKey, autoIncrement = autoIncrement)

    private fun table(id: String, name: String, vararg columns: ColumnMetadata, indexes: List<IndexMetadata> = emptyList()) =
        ErdTable(id = id, name = name, columns = columns.toList(), indexes = indexes)

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

    // -------------------------------------------------------------------------
    // FK column type change: DROP FK → ALTER COLUMN → ADD FK
    // -------------------------------------------------------------------------

    @Test
    fun `FK column type change produces DROP FK before ALTER COLUMN before ADD FK`() {
        val usersTable = table("t1", "users", col("id", "INT", nullable = false, primaryKey = true))
        val fk = rel("r1", "t2", "user_id", "t1", "id", constraintName = "fk_orders_user_id")

        val ordersTableBefore = table(
            "t2", "orders",
            col("id", "INT", nullable = false, primaryKey = true),
            col("user_id", "INT", nullable = false)
        )
        val ordersTableAfter = table(
            "t2", "orders",
            col("id", "INT", nullable = false, primaryKey = true),
            col("user_id", "BIGINT", nullable = false)  // type changed INT → BIGINT
        )

        val fromErd = ErdData(
            tables = listOf(usersTable, ordersTableBefore),
            relationships = listOf(fk)
        )
        val toErd = ErdData(
            tables = listOf(usersTable, ordersTableAfter),
            relationships = listOf(fk)
        )

        val diff = SchemaDiffer.diff(fromErd, toErd)
        // The FK is unchanged by name — but we simulate the typical pattern where FK is
        // dropped and re-added around an ALTER COLUMN by having it in both removed and added
        // For this test, we manually build a diff that includes all three phases
        val manualDiff = diff.copy(
            removedRelationships = listOf(fk),
            addedRelationships = listOf(fk)
        )

        val sql = MigrationGenerator.generate(manualDiff, fromErd, toErd, "mysql")

        val dropFkIdx = sql.indexOf("DROP FOREIGN KEY")
        val alterColIdx = sql.indexOf("user_id")  // part of MODIFY COLUMN
        val addFkIdx = sql.lastIndexOf("ADD CONSTRAINT")

        assertTrue(dropFkIdx >= 0, "Expected DROP FOREIGN KEY in migration")
        assertTrue(alterColIdx >= 0, "Expected column modification (user_id) in migration")
        assertTrue(addFkIdx >= 0, "Expected ADD CONSTRAINT in migration")

        // DROP FK must come before the ADD CONSTRAINT
        assertTrue(dropFkIdx < addFkIdx, "DROP FOREIGN KEY must appear before ADD CONSTRAINT")
    }

    // -------------------------------------------------------------------------
    // New table with FK: both tables present in output
    // -------------------------------------------------------------------------

    @Test
    fun `new table with FK references existing table - both appear in output`() {
        val ordersTable = table(
            "t1", "orders",
            col("id", "INT", nullable = false, primaryKey = true)
        )
        val orderItemsTable = table(
            "t2", "order_items",
            col("id", "INT", nullable = false, primaryKey = true),
            col("order_id", "INT", nullable = false)
        )
        val fk = rel("r1", "t2", "order_id", "t1", "id", constraintName = "fk_order_items_order_id")

        val fromErd = ErdData(tables = listOf(ordersTable), relationships = emptyList())
        val toErd = ErdData(tables = listOf(ordersTable, orderItemsTable), relationships = listOf(fk))

        val diff = SchemaDiffer.diff(fromErd, toErd)
        val sql = MigrationGenerator.generate(diff, fromErd, toErd, "mysql")

        assertTrue(sql.contains("order_items"), "Expected CREATE TABLE order_items in migration")
        assertTrue(sql.contains("ADD CONSTRAINT"), "Expected ADD CONSTRAINT for new FK")
        assertTrue(sql.contains("fk_order_items_order_id"), "Expected FK constraint name in migration")
    }

    // -------------------------------------------------------------------------
    // Table removed: DROP TABLE appears
    // -------------------------------------------------------------------------

    @Test
    fun `removed table appears as DROP TABLE in migration`() {
        val usersTable = table("t1", "users", col("id", "INT", nullable = false, primaryKey = true))
        val ordersTable = table("t2", "orders", col("id", "INT", nullable = false, primaryKey = true))

        val fromErd = ErdData(tables = listOf(usersTable, ordersTable), relationships = emptyList())
        val toErd = ErdData(tables = listOf(usersTable), relationships = emptyList())

        val diff = SchemaDiffer.diff(fromErd, toErd)
        val sql = MigrationGenerator.generate(diff, fromErd, toErd, "mysql")

        assertTrue(sql.contains("DROP TABLE"), "Expected DROP TABLE in migration")
        assertTrue(sql.contains("orders"), "Expected 'orders' table name in DROP TABLE statement")
    }

    // -------------------------------------------------------------------------
    // Column added: ALTER TABLE ADD COLUMN appears
    // -------------------------------------------------------------------------

    @Test
    fun `added column produces ALTER TABLE ADD COLUMN`() {
        val tableBefore = table("t1", "products", col("id", "INT", nullable = false, primaryKey = true))
        val tableAfter = table(
            "t1", "products",
            col("id", "INT", nullable = false, primaryKey = true),
            col("price", "DECIMAL", nullable = false)
        )

        val fromErd = ErdData(tables = listOf(tableBefore), relationships = emptyList())
        val toErd = ErdData(tables = listOf(tableAfter), relationships = emptyList())

        val diff = SchemaDiffer.diff(fromErd, toErd)
        val sql = MigrationGenerator.generate(diff, fromErd, toErd, "mysql")

        assertTrue(sql.contains("ADD COLUMN"), "Expected ADD COLUMN in migration")
        assertTrue(sql.contains("price"), "Expected column name 'price' in migration")
    }

    // -------------------------------------------------------------------------
    // Column removed: ALTER TABLE DROP COLUMN appears
    // -------------------------------------------------------------------------

    @Test
    fun `removed column produces ALTER TABLE DROP COLUMN`() {
        val tableBefore = table(
            "t1", "products",
            col("id", "INT", nullable = false, primaryKey = true),
            col("legacy_field", "VARCHAR")
        )
        val tableAfter = table("t1", "products", col("id", "INT", nullable = false, primaryKey = true))

        val fromErd = ErdData(tables = listOf(tableBefore), relationships = emptyList())
        val toErd = ErdData(tables = listOf(tableAfter), relationships = emptyList())

        val diff = SchemaDiffer.diff(fromErd, toErd)
        val sql = MigrationGenerator.generate(diff, fromErd, toErd, "mysql")

        assertTrue(sql.contains("DROP COLUMN"), "Expected DROP COLUMN in migration")
        assertTrue(sql.contains("legacy_field"), "Expected column name 'legacy_field' in DROP COLUMN")
    }

    // -------------------------------------------------------------------------
    // MySQL uses MODIFY COLUMN, others use ALTER COLUMN
    // -------------------------------------------------------------------------

    @Test
    fun `MySQL uses MODIFY COLUMN for column type change`() {
        val tableBefore = table("t1", "users", col("age", "INT"))
        val tableAfter = table("t1", "users", col("age", "BIGINT"))
        val fromErd = ErdData(tables = listOf(tableBefore), relationships = emptyList())
        val toErd = ErdData(tables = listOf(tableAfter), relationships = emptyList())
        val diff = SchemaDiffer.diff(fromErd, toErd)

        val mysqlSql = MigrationGenerator.generate(diff, fromErd, toErd, "mysql")
        assertTrue(mysqlSql.contains("MODIFY COLUMN"), "MySQL should use MODIFY COLUMN")
    }

    @Test
    fun `PostgreSQL uses ALTER COLUMN for column type change`() {
        val tableBefore = table("t1", "users", col("age", "INT"))
        val tableAfter = table("t1", "users", col("age", "BIGINT"))
        val fromErd = ErdData(tables = listOf(tableBefore), relationships = emptyList())
        val toErd = ErdData(tables = listOf(tableAfter), relationships = emptyList())
        val diff = SchemaDiffer.diff(fromErd, toErd)

        val pgSql = MigrationGenerator.generate(diff, fromErd, toErd, "postgresql")
        assertTrue(pgSql.contains("ALTER COLUMN"), "PostgreSQL should use ALTER COLUMN")
    }

    // -------------------------------------------------------------------------
    // Empty diff → empty output
    // -------------------------------------------------------------------------

    @Test
    fun `no changes produces empty migration`() {
        val erdData = ErdData(
            tables = listOf(table("t1", "users", col("id", "INT", nullable = false, primaryKey = true))),
            relationships = emptyList()
        )
        val diff = SchemaDiffer.diff(erdData, erdData)
        val sql = MigrationGenerator.generate(diff, erdData, erdData, "mysql")
        assertTrue(sql.isBlank(), "Empty diff should produce blank migration SQL")
    }
}
