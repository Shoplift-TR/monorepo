package com.shoplift.app.core.data.repository

import com.shoplift.app.core.models.Restaurant
import com.shoplift.app.core.models.MenuItem
import com.shoplift.app.core.network.ApiResponse
import com.shoplift.app.core.network.ApiService
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RestaurantRepository @Inject constructor(
    private val apiService: ApiService
) {
    private val _restaurants = MutableStateFlow<List<Restaurant>>(emptyList())
    val restaurants: Flow<List<Restaurant>> = _restaurants.asStateFlow()
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: Flow<Boolean> = _isLoading.asStateFlow()
    
    private val _error = MutableStateFlow<String?>(null)
    val error: Flow<String?> = _error.asStateFlow()
    
    suspend fun fetchRestaurants(): Result<List<Restaurant>> {
        _isLoading.value = true
        _error.value = null
        
        return try {
            val response = apiService.getRestaurants()
            if (response.isSuccessful && response.body()?.success == true) {
                val restaurants = response.body()?.data ?: emptyList()
                _restaurants.value = restaurants
                _isLoading.value = false
                Result.success(restaurants)
            } else {
                val error = response.body()?.error
                _error.value = error?.message ?: "Failed to fetch restaurants"
                _isLoading.value = false
                Result.failure(Exception(_error.value))
            }
        } catch (e: Exception) {
            _error.value = e.message ?: "Network error"
            _isLoading.value = false
            Result.failure(e)
        }
    }
    
    suspend fun getRestaurant(id: String): Result<Restaurant> {
        return try {
            val response = apiService.getRestaurant(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val restaurant = response.body()?.data
                if (restaurant != null) {
                    Result.success(restaurant)
                } else {
                    Result.failure(Exception("Restaurant not found"))
                }
            } else {
                val error = response.body()?.error
                Result.failure(Exception(error?.message ?: "Failed to fetch restaurant"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun getRestaurantMenu(id: String): Result<List<MenuItem>> {
        return try {
            val response = apiService.getRestaurantMenu(id)
            if (response.isSuccessful && response.body()?.success == true) {
                val menuItems = response.body()?.data ?: emptyList()
                Result.success(menuItems)
            } else {
                val error = response.body()?.error
                Result.failure(Exception(error?.message ?: "Failed to fetch menu"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
