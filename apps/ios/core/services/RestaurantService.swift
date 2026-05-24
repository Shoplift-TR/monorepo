import Foundation
import Combine

class RestaurantService: ObservableObject {
    private let networkService = NetworkService.shared
    
    @Published var restaurants: [Restaurant] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func fetchRestaurants() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let endpoint = APIEndpoint.restaurants
            let response: APIResponse<[Restaurant]> = try await networkService.request(endpoint: endpoint, responseType: APIResponse<[Restaurant]>.self)
            
            await MainActor.run {
                self.restaurants = response.data ?? []
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Failed to fetch restaurants: \(error.localizedDescription)"
                self.isLoading = false
            }
        }
    }
    
    func fetchRestaurant(id: String) async throws -> Restaurant {
        let endpoint = APIEndpoint.restaurant(id: id)
        let response: APIResponse<Restaurant> = try await networkService.request(endpoint: endpoint, responseType: APIResponse<Restaurant>.self)
        return response.data!
    }
    
    func fetchRestaurantMenu(id: String) async throws -> [MenuItem] {
        let endpoint = APIEndpoint.restaurantMenu(id: id)
        let response: APIResponse<[MenuItem]> = try await networkService.request(endpoint: endpoint, responseType: APIResponse<[MenuItem]>.self)
        return response.data ?? []
    }
}

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: APIError?
}

struct APIError: Codable {
    let code: String
    let message: String
}
