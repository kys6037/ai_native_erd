package com.erd

import com.erd.ddl.DdlParser
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class DdlParserTest {

    // -------------------------------------------------------------------------
    // Simple CREATE TABLE
    // -------------------------------------------------------------------------

    @Test
    fun `parse simple CREATE TABLE`() {
        val sql = """
            CREATE TABLE users (
                id INT NOT NULL,
                email VARCHAR(255) NOT NULL
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        assertEquals(1, result.erdData.tables.size)
        val table = result.erdData.tables[0]
        assertEquals("users", table.name)
        assertEquals(2, table.columns.size)
        val names = table.columns.map { it.name }
        assertTrue("id" in names)
        assertTrue("email" in names)
    }

    // -------------------------------------------------------------------------
    // Inline PRIMARY KEY
    // -------------------------------------------------------------------------

    @Test
    fun `parse inline PRIMARY KEY column`() {
        val sql = """
            CREATE TABLE orders (
                id INT PRIMARY KEY NOT NULL,
                amount DECIMAL(10,2)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        assertEquals(1, result.erdData.tables.size)
        val idCol = result.erdData.tables[0].columns.find { it.name == "id" }
        assertNotNull(idCol, "id column should be present")
        assertTrue(idCol!!.primaryKey, "id should be primary key")
    }

    // -------------------------------------------------------------------------
    // Table-level PRIMARY KEY constraint
    // -------------------------------------------------------------------------

    @Test
    fun `parse table-level PRIMARY KEY constraint`() {
        val sql = """
            CREATE TABLE products (
                id INT NOT NULL,
                name VARCHAR(255),
                PRIMARY KEY (id)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        assertEquals(1, result.erdData.tables.size)
        val idCol = result.erdData.tables[0].columns.find { it.name == "id" }
        assertNotNull(idCol, "id column should be present")
        assertTrue(idCol!!.primaryKey, "id should be primary key from table-level constraint")
    }

    // -------------------------------------------------------------------------
    // FOREIGN KEY
    // -------------------------------------------------------------------------

    @Test
    fun `parse FOREIGN KEY creates relationship`() {
        val sql = """
            CREATE TABLE users (
                id INT PRIMARY KEY NOT NULL
            );
            CREATE TABLE orders (
                id INT PRIMARY KEY NOT NULL,
                user_id INT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        assertEquals(2, result.erdData.tables.size)
        assertEquals(1, result.erdData.relationships.size)
        val rel = result.erdData.relationships[0]
        assertEquals("user_id", rel.sourceColumnName)
        assertEquals("id", rel.targetColumnName)
    }

    // -------------------------------------------------------------------------
    // FK resolution: target table ID should be resolved
    // -------------------------------------------------------------------------

    @Test
    fun `parse FK resolves target table ID`() {
        val sql = """
            CREATE TABLE users (
                id INT PRIMARY KEY NOT NULL
            );
            CREATE TABLE orders (
                id INT PRIMARY KEY NOT NULL,
                user_id INT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        val usersId = result.erdData.tables.find { it.name == "users" }!!.id
        val rel = result.erdData.relationships[0]
        assertEquals(usersId, rel.targetTableId, "FK target should be resolved to the actual table ID")
        assertTrue(result.warnings.none { it.contains("Could not resolve") },
            "Should have no unresolved FK warnings")
    }

    // -------------------------------------------------------------------------
    // Unresolvable FK → warning, not exception
    // -------------------------------------------------------------------------

    @Test
    fun `parse FK to unknown table produces warning`() {
        val sql = """
            CREATE TABLE orders (
                id INT PRIMARY KEY NOT NULL,
                user_id INT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES nonexistent(id)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        // Should not throw; should produce a warning
        assertTrue(result.warnings.any { it.contains("Could not resolve") || it.contains("nonexistent") },
            "Expected warning for unresolvable FK target")
    }

    // -------------------------------------------------------------------------
    // Invalid / garbage SQL → returns warnings, not exception
    // -------------------------------------------------------------------------

    @Test
    fun `invalid SQL does not throw exception`() {
        val sql = "this is not valid sql at all $$$ ###"
        val result = DdlParser.parse(sql)
        // Should parse without throwing; result may be empty
        assertNotNull(result)
        assertNotNull(result.erdData)
    }

    // -------------------------------------------------------------------------
    // Empty string → empty ErdData
    // -------------------------------------------------------------------------

    @Test
    fun `empty string returns empty ErdData`() {
        val result = DdlParser.parse("")
        assertEquals(0, result.erdData.tables.size, "Expected no tables for empty input")
        assertEquals(0, result.erdData.relationships.size, "Expected no relationships for empty input")
        assertTrue(result.warnings.isEmpty(), "Expected no warnings for empty input")
    }

    // -------------------------------------------------------------------------
    // AUTO_INCREMENT detection
    // -------------------------------------------------------------------------

    @Test
    fun `parse AUTO_INCREMENT column`() {
        val sql = """
            CREATE TABLE users (
                id INT NOT NULL AUTO_INCREMENT,
                PRIMARY KEY (id)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        val idCol = result.erdData.tables[0].columns.find { it.name == "id" }
        assertNotNull(idCol)
        assertTrue(idCol!!.autoIncrement, "id should be detected as autoIncrement")
    }

    // -------------------------------------------------------------------------
    // NOT NULL detection
    // -------------------------------------------------------------------------

    @Test
    fun `parse NOT NULL column is not nullable`() {
        val sql = """
            CREATE TABLE test (
                a INT NOT NULL,
                b VARCHAR(100)
            );
        """.trimIndent()
        val result = DdlParser.parse(sql)
        val cols = result.erdData.tables[0].columns.associateBy { it.name }
        assertFalse(cols["a"]!!.nullable, "a should not be nullable")
        assertTrue(cols["b"]!!.nullable, "b should be nullable")
    }

    // -------------------------------------------------------------------------
    // Multiple tables
    // -------------------------------------------------------------------------

    @Test
    fun `parse multiple CREATE TABLE statements`() {
        val sql = """
            CREATE TABLE a (id INT PRIMARY KEY);
            CREATE TABLE b (id INT PRIMARY KEY);
            CREATE TABLE c (id INT PRIMARY KEY);
        """.trimIndent()
        val result = DdlParser.parse(sql)
        assertEquals(3, result.erdData.tables.size)
        val names = result.erdData.tables.map { it.name }.toSet()
        assertTrue(names.containsAll(listOf("a", "b", "c")))
    }
}
