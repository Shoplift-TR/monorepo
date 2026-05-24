import Foundation

enum APIEndpoint {
    // Auth
    case login(email: String, password: String)
    case register(email: String, password: String, name: String)
    case logout
    case me
    
    // Restaurants
    case restaurants
    case restaurant(id: String)
    case restaurantMenu(id: String)
    
    // Orders
    case orders
    case order(id: String)
    case orderHistory
    case updateOrderStatus(id: String, status: OrderStatus)
    
    // Addresses
    case addresses
    case createAddress(label: String, street: String, district: String, city: String)
}

extension APIEndpoint {
    var path: String {
        switch self {
        case .login:
            return "/auth/login"
        case .register:
            return "/auth/register"
        case .logout:
            return "/auth/logout"
        case .me:
            return "/auth/me"
        case .restaurants:
            return "/restaurants"
        case .restaurant(let id):
            return "/restaurants/\(id)"
        case .restaurantMenu(let id):
            return "/restaurants/\(id)/menu"
        case .orders:
            return "/orders"
        case .order(let id):
            return "/orders/\(id)"
        case .orderHistory:
            return "/orders/history"
        case .updateOrderStatus(let id, let status):
            return "/orders/\(id)/status"
        case .addresses:
            return "/addresses"
        case .createAddress:
            return "/addresses"
        }
    }
    
    var method: HTTPMethod {
        switch self {
        case .login, .register, .orders, .createAddress, .updateOrderStatus:
            return .POST
        case .logout:
            return .DELETE
        default:
            return .GET
        }
    }
    
    var body: [String: Any]? {
        switch self {
        case .login(let email, let password):
            return ["email": email, "password": password]
        case .register(let email, let password, let name):
            return ["email": email, "password": password, "name": name]
        case .updateOrderStatus(_, let status):
            return ["status": status.rawValue]
        case .createAddress(let label, let street, let district, let city):
            return ["label": label, "street": street, "district": district, "city": city]
        default:
            return nil
        }
    }
    
    func url(baseURL: String) -> URL? {
        return URL(string: baseURL + path)
    }
}

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
}
