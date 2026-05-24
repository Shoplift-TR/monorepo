package com.shoplift.app.core.models

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val email: String,
    val displayName: String,
    val role: String,
    val restaurantId: String? = null
) {
    @Serializable
    data class AuthResponse(
        val accessToken: String,
        val user: User
    )
}
