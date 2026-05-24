package com.shoplift.app.core.network

import com.shoplift.app.core.models.User
import com.shoplift.app.core.models.Restaurant
import com.shoplift.app.core.models.MenuItem
import com.shoplift.app.core.models.Order
import com.shoplift.app.core.models.Address
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface ApiService {
    
    // Auth endpoints
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<User.AuthResponse>>
    
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<Unit>>
    
    @DELETE("auth/logout")
    suspend fun logout(): Response<ApiResponse<Unit>>
    
    @GET("auth/me")
    suspend fun getCurrentUser(@Header("Authorization") token: String): Response<ApiResponse<User>>
    
    // Restaurant endpoints
    @GET("restaurants")
    suspend fun getRestaurants(): Response<ApiResponse<List<Restaurant>>>
    
    @GET("restaurants/{id}")
    suspend fun getRestaurant(@Path("id") id: String): Response<ApiResponse<Restaurant>>
    
    @GET("restaurants/{id}/menu")
    suspend fun getRestaurantMenu(@Path("id") id: String): Response<ApiResponse<List<MenuItem>>>
    
    // Order endpoints
    @GET("orders/history")
    suspend fun getOrderHistory(): Response<ApiResponse<List<Order>>>
    
    @GET("orders/{id}")
    suspend fun getOrder(@Path("id") id: String): Response<ApiResponse<Order>>
    
    // Address endpoints
    @GET("addresses")
    suspend fun getAddresses(): Response<ApiResponse<List<Address>>>
    
    @POST("addresses")
    suspend fun createAddress(@Body request: CreateAddressRequest): Response<ApiResponse<Address>>
}

@Serializable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: ApiError? = null
)

@Serializable
data class ApiError(
    val code: String,
    val message: String
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String
)

@Serializable
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String
)

@Serializable
data class CreateAddressRequest(
    val label: String,
    val street: String,
    val district: String,
    val city: String
)
