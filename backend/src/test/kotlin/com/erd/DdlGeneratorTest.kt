package com.erd

import com.erd.ddl.*
import com.erd.model.*
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DdlGeneratorTest {

    // -------------------------------------------------------------------------
    // Shared test data builders
    // -------------------------------------------------------------------------

    private fun usersTable(idAutoIncrement: Boolean = true) = ErdTable(
        id = "t1",
        name = "users",
        columns = listOf(
            ColumnMetadata(
                name = "id",
                type = "INT",
                primaryKey = true,
                nullable = false,
                autoIncrement = idAutoIncrement
            ),
            ColumnMetadata(
                name = "email",
                type = "VARCHAR",
                length = 255,
                nullable = false
            )
        ),
        indexes = emptyList()
    )

    private fun ordersTable() = ErdTable(
        id = "t2",
        name = "orders",
        columns = listOf(
            ColumnMetadata(name = "id", type = "INT", primaryKey = true, nullable = false),
            ColumnMetadata(name = "user_id", type = "INT", nullable = false)
        ),
        indexes = listOf(
            IndexMetadata(name = "idx_orders_user", columns = listOf("user_id"), unique = false)
        )
    )

    private fun fkRelationship() = ErdRelationship(
        id = "r1",
        sourceTableId = "t2",
        sourceColumnName = "user_id",
        targetTableId = "t1",
        targetColumnName = "id",
        constraintName = "fk_orders_user_id"
    )

    private fun buildErdData() = ErdData(
        tables = listOf(usersTable(), ordersTable()),
        relationships = listOf(fkRelationship())
    )

    // -------------------------------------------------------------------------
    // MySQL tests
    // -------------------------------------------------------------------------

    @Test
    fun `MySQL generate contains backtick-quoted table names`() {
        val gen = MySqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("`users`"), "Expected backtick-quoted 'users' table")
        assertTrue(sql.contains("`orders`"), "Expected backtick-quoted 'orders' table")
    }

    @Test
    fun `MySQL generate contains AUTO_INCREMENT`() {
        val gen = MySqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("AUTO_INCREMENT"), "Expected AUTO_INCREMENT in MySQL DDL")
    }

    @Test
    fun `MySQL generate contains FK constraint`() {
        val gen = MySqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("fk_orders_user_id"), "Expected FK constraint name in MySQL DDL")
        assertTrue(sql.contains("FOREIGN KEY"), "Expected FOREIGN KEY keyword in MySQL DDL")
    }

    @Test
    fun `MySQL generate contains index`() {
        val gen = MySqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("idx_orders_user"), "Expected index name in MySQL DDL")
        assertTrue(sql.contains("CREATE INDEX"), "Expected CREATE INDEX in MySQL DDL")
    }

    @Test
    fun `MySQL columnType mappings`() {
        val gen = MySqlDdlGenerator()
        assertEquals("INT", gen.columnType(ColumnMetadata("c", "INT")))
        assertEquals("VARCHAR(255)", gen.columnType(ColumnMetadata("c", "VARCHAR")))
        assertEquals("TINYINT(1)", gen.columnType(ColumnMetadata("c", "BOOLEAN")))
        assertEquals("DATETIME", gen.columnType(ColumnMetadata("c", "TIMESTAMP")))
    }

    // -------------------------------------------------------------------------
    // PostgreSQL tests
    // -------------------------------------------------------------------------

    @Test
    fun `PostgreSQL generate uses double-quote identifiers`() {
        val gen = PostgreSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("\"users\""), "Expected double-quoted 'users' in PostgreSQL DDL")
        assertTrue(sql.contains("\"orders\""), "Expected double-quoted 'orders' in PostgreSQL DDL")
    }

    @Test
    fun `PostgreSQL generate uses SERIAL for autoincrement`() {
        val gen = PostgreSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("SERIAL"), "Expected SERIAL in PostgreSQL DDL")
    }

    @Test
    fun `PostgreSQL generate contains FK constraint`() {
        val gen = PostgreSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("fk_orders_user_id"), "Expected FK constraint name in PostgreSQL DDL")
        assertTrue(sql.contains("FOREIGN KEY"), "Expected FOREIGN KEY in PostgreSQL DDL")
    }

    @Test
    fun `PostgreSQL generate contains index`() {
        val gen = PostgreSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("idx_orders_user"), "Expected index in PostgreSQL DDL")
    }

    @Test
    fun `PostgreSQL columnType mappings`() {
        val gen = PostgreSqlDdlGenerator()
        assertEquals("INTEGER", gen.columnType(ColumnMetadata("c", "INT")))
        assertEquals("VARCHAR(255)", gen.columnType(ColumnMetadata("c", "VARCHAR")))
        assertEquals("BOOLEAN", gen.columnType(ColumnMetadata("c", "BOOLEAN")))
        assertEquals("TIMESTAMP", gen.columnType(ColumnMetadata("c", "TIMESTAMP")))
    }

    // -------------------------------------------------------------------------
    // Oracle tests
    // -------------------------------------------------------------------------

    @Test
    fun `Oracle generate uses uppercase unquoted identifiers`() {
        val gen = OracleDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("USERS"), "Expected uppercase USERS in Oracle DDL")
        assertTrue(sql.contains("ORDERS"), "Expected uppercase ORDERS in Oracle DDL")
        assertFalse(sql.contains("`"), "Oracle DDL should not contain backticks")
        assertFalse(sql.contains("\"USERS\""), "Oracle DDL should not wrap with double quotes")
    }

    @Test
    fun `Oracle generate contains SEQUENCE for autoincrement`() {
        val gen = OracleDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("CREATE SEQUENCE"), "Expected CREATE SEQUENCE in Oracle DDL")
        assertTrue(sql.contains("CREATE OR REPLACE TRIGGER"), "Expected TRIGGER in Oracle DDL")
    }

    @Test
    fun `Oracle generate contains FK constraint`() {
        val gen = OracleDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("fk_orders_user_id") || sql.contains("FK_ORDERS_USER_ID"),
            "Expected FK constraint name in Oracle DDL")
        assertTrue(sql.contains("FOREIGN KEY"), "Expected FOREIGN KEY in Oracle DDL")
    }

    @Test
    fun `Oracle columnType mappings`() {
        val gen = OracleDdlGenerator()
        assertEquals("NUMBER(10)", gen.columnType(ColumnMetadata("c", "INT")))
        assertEquals("VARCHAR2(255)", gen.columnType(ColumnMetadata("c", "VARCHAR")))
        assertEquals("NUMBER(1)", gen.columnType(ColumnMetadata("c", "BOOLEAN")))
        assertEquals("TIMESTAMP", gen.columnType(ColumnMetadata("c", "TIMESTAMP")))
    }

    // -------------------------------------------------------------------------
    // MSSQL tests
    // -------------------------------------------------------------------------

    @Test
    fun `MSSQL generate uses bracket identifiers`() {
        val gen = MsSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("[users]"), "Expected bracket-quoted [users] in MSSQL DDL")
        assertTrue(sql.contains("[orders]"), "Expected bracket-quoted [orders] in MSSQL DDL")
    }

    @Test
    fun `MSSQL generate uses IDENTITY for autoincrement`() {
        val gen = MsSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("IDENTITY"), "Expected IDENTITY in MSSQL DDL")
    }

    @Test
    fun `MSSQL generate contains FK constraint`() {
        val gen = MsSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("fk_orders_user_id"), "Expected FK constraint name in MSSQL DDL")
        assertTrue(sql.contains("FOREIGN KEY"), "Expected FOREIGN KEY in MSSQL DDL")
    }

    @Test
    fun `MSSQL generate contains index`() {
        val gen = MsSqlDdlGenerator()
        val sql = gen.generate(buildErdData())
        assertTrue(sql.contains("idx_orders_user"), "Expected index in MSSQL DDL")
    }

    @Test
    fun `MSSQL columnType mappings`() {
        val gen = MsSqlDdlGenerator()
        assertEquals("INT", gen.columnType(ColumnMetadata("c", "INT")))
        assertEquals("NVARCHAR(255)", gen.columnType(ColumnMetadata("c", "VARCHAR")))
        assertEquals("BIT", gen.columnType(ColumnMetadata("c", "BOOLEAN")))
        assertEquals("DATETIME2", gen.columnType(ColumnMetadata("c", "TIMESTAMP")))
    }

    // -------------------------------------------------------------------------
    // getDdlGenerator factory
    // -------------------------------------------------------------------------

    @Test
    fun `getDdlGenerator returns correct instances`() {
        assertTrue(getDdlGenerator("mysql") is MySqlDdlGenerator)
        assertTrue(getDdlGenerator("postgresql") is PostgreSqlDdlGenerator)
        assertTrue(getDdlGenerator("oracle") is OracleDdlGenerator)
        assertTrue(getDdlGenerator("mssql") is MsSqlDdlGenerator)
    }

    @Test
    fun `getDdlGenerator throws for unknown dialect`() {
        assertThrows(IllegalArgumentException::class.java) {
            getDdlGenerator("sqlite")
        }
    }

    // -------------------------------------------------------------------------
    // Index unique flag test
    // -------------------------------------------------------------------------

    @Test
    fun `unique index uses CREATE UNIQUE INDEX`() {
        val gen = MySqlDdlGenerator()
        val table = ErdTable(
            id = "t3",
            name = "items",
            columns = listOf(ColumnMetadata("sku", "VARCHAR", nullable = false)),
            indexes = listOf(IndexMetadata("idx_sku_unique", listOf("sku"), unique = true))
        )
        val sql = gen.generate(ErdData(tables = listOf(table), relationships = emptyList()))
        assertTrue(sql.contains("CREATE UNIQUE INDEX"), "Expected CREATE UNIQUE INDEX for unique index")
    }
}
