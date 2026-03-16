package com.erd.model

data class Project(
    val id: Int,
    val userId: Int,
    val name: String,
    val description: String?,
    val erdData: ErdData,
    val createdAt: String,
    val updatedAt: String,
    val inviteToken: String? = null
)
