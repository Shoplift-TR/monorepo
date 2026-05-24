package com.shoplift.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shoplift.app.core.data.repository.RestaurantRepository
import com.shoplift.app.core.models.Restaurant
import com.shoplift.app.core.models.MenuItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class RestaurantViewModel @Inject constructor(
    private val restaurantRepository: RestaurantRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(RestaurantUiState())
    val uiState: StateFlow<RestaurantUiState> = _uiState.asStateFlow()
    
    init {
        viewModelScope.launch {
            combine(
                restaurantRepository.restaurants,
                restaurantRepository.isLoading,
                restaurantRepository.error
            ) { restaurants, isLoading, error ->
                _uiState.value = _uiState.value.copy(
                    restaurants = restaurants,
                    isLoading = isLoading,
                    error = error
                )
            }.collect { }
        }
        
        fetchRestaurants()
    }
    
    fun fetchRestaurants() {
        viewModelScope.launch {
            restaurantRepository.fetchRestaurants()
        }
    }
    
    fun getRestaurantDetail(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingDetail = true, error = null)
            
            val result = restaurantRepository.getRestaurant(id)
            result.fold(
                onSuccess = { restaurant ->
                    _uiState.value = _uiState.value.copy(
                        selectedRestaurant = restaurant,
                        isLoadingDetail = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingDetail = false,
                        error = error.message
                    )
                }
            )
        }
    }
    
    fun getRestaurantMenu(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingMenu = true, error = null)
            
            val result = restaurantRepository.getRestaurantMenu(id)
            result.fold(
                onSuccess = { menuItems ->
                    _uiState.value = _uiState.value.copy(
                        menuItems = menuItems,
                        isLoadingMenu = false
                    )
                },
                onFailure = { error ->
                    _uiState.value = _uiState.value.copy(
                        isLoadingMenu = false,
                        error = error.message
                    )
                }
            )
        }
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
    
    fun clearSelectedRestaurant() {
        _uiState.value = _uiState.value.copy(
            selectedRestaurant = null,
            menuItems = emptyList()
        )
    }
}

data class RestaurantUiState(
    val restaurants: List<Restaurant> = emptyList(),
    val selectedRestaurant: Restaurant? = null,
    val menuItems: List<MenuItem> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingDetail: Boolean = false,
    val isLoadingMenu: Boolean = false,
    val error: String? = null
)
