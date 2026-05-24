package com.shoplift.app.core.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.shoplift.app.core.models.User
import com.shoplift.app.core.network.ApiService
import dagger.hilt.android.qualifiers.ApplicationContext
import com.shoplift.app.core.network.LoginRequest
import com.shoplift.app.core.network.RegisterRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val apiService: ApiService,
    @ApplicationContext private val context: Context
) {
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("auth_prefs", Context.MODE_PRIVATE)
    
    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: Flow<User?> = _currentUser.asStateFlow()
    
    private val _isAuthenticated = MutableStateFlow(false)
    val isAuthenticated: Flow<Boolean> = _isAuthenticated.asStateFlow()
    
    init {
        checkStoredToken()
    }
    
    suspend fun login(email: String, password: String): Result<User> {
        return try {
            val response = apiService.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val authResponse = response.body()?.data
                if (authResponse != null) {
                    saveAuthToken(authResponse.accessToken)
                    _currentUser.value = authResponse.user
                    _isAuthenticated.value = true
                    Result.success(authResponse.user)
                } else {
                    Result.failure(Exception("Invalid response"))
                }
            } else {
                val error = response.body()?.error
                Result.failure(Exception(error?.message ?: "Login failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun register(email: String, password: String, name: String): Result<Unit> {
        return try {
            val response = apiService.register(RegisterRequest(email, password, name))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(Unit)
            } else {
                val error = response.body()?.error
                Result.failure(Exception(error?.message ?: "Registration failed"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun logout() {
        try {
            apiService.logout()
        } catch (e: Exception) {
            // Ignore logout API errors
        }
        clearAuthData()
    }
    
    suspend fun refreshCurrentUser(): Result<User> {
        return try {
            val token = getAuthToken()
            if (token == null) {
                return Result.failure(Exception("No auth token"))
            }
            
            val response = apiService.getCurrentUser("Bearer $token")
            if (response.isSuccessful && response.body()?.success == true) {
                val user = response.body()?.data
                if (user != null) {
                    _currentUser.value = user
                    _isAuthenticated.value = true
                    Result.success(user)
                } else {
                    clearAuthData()
                    Result.failure(Exception("Invalid user data"))
                }
            } else {
                clearAuthData()
                Result.failure(Exception("Failed to refresh user"))
            }
        } catch (e: Exception) {
            clearAuthData()
            Result.failure(e)
        }
    }
    
    private fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString("auth_token", token).apply()
    }
    
    private fun getAuthToken(): String? {
        return sharedPreferences.getString("auth_token", null)
    }
    
    private fun clearAuthData() {
        sharedPreferences.edit().remove("auth_token").apply()
        _currentUser.value = null
        _isAuthenticated.value = false
    }
    
    private fun checkStoredToken() {
        val token = getAuthToken()
        if (token != null) {
            // Try to refresh current user data
            // This will be called from the ViewModel
        }
    }
}
