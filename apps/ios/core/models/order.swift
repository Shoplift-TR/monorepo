import Foundation

enum OrderStatus: String, Codable, CaseIterable {
    case pending = "PENDING"
    case confirmed = "CONFIRMED"
    case preparing = "PREPARING"
    case readyForPickup = "READY_FOR_PICKUP"
    case outForDelivery = "OUT_FOR_DELIVERY"
    case delivered = "DELIVERED"
    case cancelled = "CANCELLED"
}

struct Order: Codable, Identifiable {
    let id: String
    let customerId: String
    let restaurantId: String
    let items: [OrderItem]
    let status: OrderStatus
    let paymentMethod: String
    let paymentGateway: String?
    let paymentIntentId: String?
    let subtotal: Int
    let deliveryFee: Int
    let discount: Int
    let total: Int
    let promoCode: String?
    let deliveryAddress: Address
    let estimatedDeliveryTime: String?
    let notes: String?
    let createdAt: String
    let confirmedAt: String?
    let deliveredAt: String?
    
    // Computed properties for UI
    var totalDisplay: String {
        return String(format: "%.2f", Double(total) / 100.0)
    }
    
    var statusDisplay: String {
        switch status {
        case .pending: return "Pending"
        case .confirmed: return "Confirmed"
        case .preparing: return "Preparing"
        case .readyForPickup: return "Ready for Pickup"
        case .outForDelivery: return "Out for Delivery"
        case .delivered: return "Delivered"
        case .cancelled: return "Cancelled"
        }
    }
}

struct OrderItem: Codable {
    let itemId: String
    let name: BilingualString
    let quantity: Int
    let unitPrice: Int
    let selectedModifiers: [SelectedModifier]?
    let specialInstructions: String?
    let subtotal: Int
    
    var displayName: String {
        return name.en
    }
    
    var subtotalDisplay: String {
        return String(format: "%.2f", Double(subtotal) / 100.0)
    }
}

struct SelectedModifier: Codable {
    let groupName: String
    let optionName: String
    let priceAdjustment: Int
}

struct Address: Codable {
    let street: String
    let district: String
    let city: String
    let coordinates: Coordinates?
}

struct Coordinates: Codable {
    let lat: Double
    let lng: Double
}
