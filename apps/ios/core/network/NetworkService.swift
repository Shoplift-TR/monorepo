import Foundation

protocol NetworkServiceProtocol {
    func request(endpoint: APIEndpoint) async throws -> Data
}

class NetworkService: NetworkServiceProtocol {
    static let shared = NetworkService()
    
    private let baseURL: String
    private let session: URLSession
    private var authToken: String?
    
    private init() {
        self.baseURL = "https://api-staging.shoplift.app" // Environment configurable
        self.session = URLSession.shared
    }
    
    func setAuthToken(_ token: String) {
        self.authToken = token
    }
    
    func clearAuthToken() {
        self.authToken = nil
    }
    
    func request(endpoint: APIEndpoint) async throws -> Data {
        guard let url = endpoint.url(baseURL: baseURL) else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        if let body = endpoint.body {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.noResponse
        }
        
        switch httpResponse.statusCode {
        case 200...299:
            return data
        case 401:
            throw NetworkError.unauthorized
        case 400:
            throw NetworkError.badRequest
        case 404:
            throw NetworkError.notFound
        case 500...599:
            throw NetworkError.serverError
        default:
            throw NetworkError.unknown
        }
    }
    
    func request<T: Codable>(endpoint: APIEndpoint, responseType: T.Type) async throws -> T {
        let data = try await request(endpoint: endpoint)
        let decoded = try JSONDecoder().decode(T.self, from: data)
        return decoded
    }
}

enum NetworkError: Error, LocalizedError {
    case invalidURL
    case noResponse
    case unauthorized
    case badRequest
    case notFound
    case serverError
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noResponse:
            return "No response from server"
        case .unauthorized:
            return "Unauthorized access"
        case .badRequest:
            return "Invalid request"
        case .notFound:
            return "Resource not found"
        case .serverError:
            return "Server error occurred"
        case .unknown:
            return "Unknown error occurred"
        }
    }
}
