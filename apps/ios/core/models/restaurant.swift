import Foundation

struct BilingualString: Codable {
    let tr: String
    let en: String
}

struct Restaurant: Codable, Identifiable {
    let id: String
    let name: BilingualString
    let description: BilingualString?
    let logo: String?
    let address: String
    let cuisineTags: [String]
    let isActive: Bool
    let isApproved: Bool
    let rating: String
    let totalOrders: Int
    let deliveryFee: Int
    let taxRate: String
    let lat: String?
    let lng: String?
    let createdAt: String
}

struct MenuItem: Codable, Identifiable {
    let id: String
    let restaurantId: String
    let name: BilingualString
    let description: BilingualString
    let price: String
    let category: String
    let imageUrl: String
    let isAvailable: Bool
    let modifiers: [ModifierGroup]
    let displayOrder: Int
}

struct ModifierGroup: Codable {
    let id: String
    let name: BilingualString
    let options: [ModifierOption]
    let required: Bool
    let maxSelections: Int
}

struct ModifierOption: Codable {
    let name: BilingualString
    let price: String
}
