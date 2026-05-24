package com.shoplift.app.core.models

import kotlinx.serialization.Serializable

@Serializable
enum class OrderStatus(val displayName: String) {
    PENDING("Pending"),
    CONFIRMED("Confirmed"),
    PREPARING("Preparing"),
    READY_FOR_PICKUP("Ready for Pickup"),
    OUT_FOR_DELIVERY("Out for Delivery"),
    DELIVERED("Delivered"),
    CANCELLED("Cancelled")
}

@Serializable
data class Order(
    val id: String,
    val customerId: String,
    val restaurantId: String,
    val items: List<OrderItem>,
    val status: OrderStatus,
    val paymentMethod: String,
    val paymentGateway: String? = null,
    val paymentIntentId: String? = null,
    val subtotal: Int,
    val deliveryFee: Int,
    val discount: Int,
    val total: Int,
    val promoCode: String? = null,
    val deliveryAddress: Address,
    val estimatedDeliveryTime: String? = null,
    val notes: String? = null,
    val createdAt: String,
    val confirmedAt: String? = null,
    val deliveredAt: String? = null
) {
    val totalDisplay: String
        get() = "$${String.format("%.2f", total / 100.0)}"
}

@Serializable
data class OrderItem(
    val itemId: String,
    val name: BilingualString,
    val quantity: Int,
    val unitPrice: Int,
    val selectedModifiers: List<SelectedModifier>? = null,
    val specialInstructions: String? = null,
    val subtotal: Int
) {
    val displayName: String
        get() = name.en
    
    val subtotalDisplay: String
        get() = "$${String.format("%.2f", subtotal / 100.0)}"
}

@Serializable
data class SelectedModifier(
    val groupName: String,
    val optionName: String,
    val priceAdjustment: Int
)

@Serializable
data class Address(
    val street: String,
    val district: String,
    val city: String,
    val coordinates: Coordinates? = null
)

@Serializable
data class Coordinates(
    val lat: Double,
    val lng: Double
)
