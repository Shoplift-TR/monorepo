import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let displayName: String
    let role: String
    let restaurantId: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "uid"
        case email
        case displayName = "display_name"
        case role
        case restaurantId = "restaurant_id"
    }
}

struct AuthResponse: Codable {
    let accessToken: String
    let user: User
}
