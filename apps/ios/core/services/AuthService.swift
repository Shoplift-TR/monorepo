import Foundation
import Combine

class AuthService: ObservableObject {
    private let networkService = NetworkService.shared
    @Published var currentUser: User?
    @Published var isAuthenticated = false
    
    private let userDefaults = UserDefaults.standard
    private let tokenKey = "auth_token"
    
    init() {
        checkStoredToken()
    }
    
    func login(email: String, password: String) async throws {
        let endpoint = APIEndpoint.login(email: email, password: password)
        
        do {
            let response: AuthResponse = try await networkService.request(endpoint: endpoint, responseType: AuthResponse.self)
            
            networkService.setAuthToken(response.accessToken)
            currentUser = response.user
            isAuthenticated = true
            
            userDefaults.set(response.accessToken, forKey: tokenKey)
        } catch {
            throw AuthError.loginFailed(error.localizedDescription)
        }
    }
    
    func register(email: String, password: String, name: String) async throws {
        let endpoint = APIEndpoint.register(email: email, password: password, name: name)
        
        do {
            let _: EmptyResponse = try await networkService.request(endpoint: endpoint, responseType: EmptyResponse.self)
        } catch {
            throw AuthError.registrationFailed(error.localizedDescription)
        }
    }
    
    func logout() {
        networkService.clearAuthToken()
        currentUser = nil
        isAuthenticated = false
        userDefaults.removeObject(forKey: tokenKey)
    }
    
    private func checkStoredToken() {
        guard let token = userDefaults.string(forKey: tokenKey) else { return }
        
        networkService.setAuthToken(token)
        Task {
            await fetchCurrentUser()
        }
    }
    
    @MainActor
    private func fetchCurrentUser() async {
        do {
            let endpoint = APIEndpoint.me
            let user: User = try await networkService.request(endpoint: endpoint, responseType: User.self)
            currentUser = user
            isAuthenticated = true
        } catch {
            logout()
        }
    }
}

enum AuthError: Error, LocalizedError {
    case loginFailed(String)
    case registrationFailed(String)
    
    var errorDescription: String? {
        switch self {
        case .loginFailed(let message):
            return "Login failed: \(message)"
        case .registrationFailed(let message):
            return "Registration failed: \(message)"
        }
    }
}

struct EmptyResponse: Codable {}
