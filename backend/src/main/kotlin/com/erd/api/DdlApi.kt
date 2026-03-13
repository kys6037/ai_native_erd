package com.erd.api

import com.erd.ddl.DdlParser
import com.erd.ddl.getDdlGenerator
import com.erd.exception.BadRequestException
import com.erd.model.GenerateDdlRequest
import com.erd.model.GenerateDdlResponse
import com.erd.model.ParseDdlRequest
import com.erd.model.ParseDdlResponse
import io.javalin.Javalin

fun registerDdlRoutes(app: Javalin) {
    // POST /api/ddl/generate — generate DDL from ErdData + dialect
    app.post("/api/ddl/generate") { ctx ->
        val req = ctx.bodyAsClass(GenerateDdlRequest::class.java)
        if (req.dialect.isBlank()) throw BadRequestException("dialect is required")
        val generator = try {
            getDdlGenerator(req.dialect)
        } catch (e: IllegalArgumentException) {
            throw BadRequestException(e.message ?: "Unsupported dialect")
        }
        val sql = generator.generate(req.erdData)
        ctx.json(GenerateDdlResponse(sql))
    }

    // POST /api/ddl/parse — parse SQL text into ErdData
    app.post("/api/ddl/parse") { ctx ->
        val req = ctx.bodyAsClass(ParseDdlRequest::class.java)
        if (req.sql.isBlank()) throw BadRequestException("sql is required")
        val result = DdlParser.parse(req.sql)
        ctx.json(ParseDdlResponse(result.erdData, result.warnings))
    }
}
