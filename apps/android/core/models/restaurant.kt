package com.shoplift.app.core.models

import kotlinx.serialization.Serializable

@Serializable
data class BilingualString(
    val tr: String,
    val en: String
)

@Serializable
data class Restaurant(
    val id: String,
    val name: BilingualString,
    val description: BilingualString? = null,
    val logo: String? = null,
    val address: String,
    val cuisineTags: List<String>,
    val isActive: Boolean,
    val isApproved: Boolean,
    val rating: String,
    val totalOrders: Int,
    val deliveryFee: Int,
    val taxRate: String,
    val lat: String? = null,
    val lng: String? = null,
    val createdAt: String
) {
    val displayRating: Double
        get() = rating.toDoubleOrNull() ?: 0.0
    
    val deliveryFeeDisplay: String
        get() = if (deliveryFee == 0) "Free" else "$${(deliveryFee / 100.0)}"
}

@Serializable
data class MenuItem(
    val id: String,
    val restaurantId: String,
    val name: BilingualString,
    val description: BilingualString,
    val price: String,
    val category: String,
    val imageUrl: String,
    val isAvailable: Boolean,
    val modifiers: List<ModifierGroup>,
    val displayOrder: Int
) {
    val priceDisplay: Double
        get() = price.toDoubleOrNull() ?: 0.0
    
    val priceDisplayString: String
        get() = "$${String.format("%.2f", priceDisplay)}"
}

@Serializable
data class ModifierGroup(
    val id: String,
    val name: BilingualString,
    val options: List<ModifierOption>,
    val required: Boolean,
    val maxSelections: Int
)

@Serializable
data class ModifierOption(
    val name: BilingualString,
    val price: String
) {
    val priceDisplay: Double
        get() = price.toDoubleOrNull() ?: 0.0
}
