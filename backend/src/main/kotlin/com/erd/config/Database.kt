package com.erd.config

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import org.slf4j.LoggerFactory
import java.sql.Connection

object Database {
    private val log = LoggerFactory.getLogger(Database::class.java)
    private lateinit var dataSource: HikariDataSource

    fun init(dbPath: String) {
        val config = HikariConfig().apply {
            jdbcUrl = "jdbc:sqlite:$dbPath"
            driverClassName = "org.sqlite.JDBC"
            maximumPoolSize = 1
            connectionInitSql = "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;"
        }
        dataSource = HikariDataSource(config)
        runSchema()
        log.info("Database initialized: $dbPath")
    }

    fun getConnection(): Connection = dataSource.connection

    private fun runSchema() {
        val sql = Database::class.java.getResourceAsStream("/schema.sql")
            ?.bufferedReader()?.readText()
            ?: error("schema.sql not found")

        getConnection().use { conn ->
            conn.createStatement().use { stmt ->
                // Execute each statement separately
                sql.split(";")
                    .map { it.trim() }
                    .filter { it.isNotEmpty() }
                    .forEach { stmt.execute(it) }
            }
        }
    }
}
