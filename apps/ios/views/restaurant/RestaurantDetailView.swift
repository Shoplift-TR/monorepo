import SwiftUI

struct RestaurantDetailView: View {
    let restaurant: Restaurant
    @StateObject private var restaurantService = RestaurantService()
    @State private var menuItems: [MenuItem] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header Image
                AsyncImage(url: URL(string: restaurant.logo ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(
                            Image(systemName: "fork.knife")
                                .font(.system(size: 50))
                                .foregroundColor(.gray)
                        )
                }
                .frame(height: 200)
                .clipped()
                
                // Restaurant Info
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(restaurant.name.en)
                                .font(.title)
                                .fontWeight(.bold)
                            
                            Text(restaurant.description?.en ?? "")
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.yellow)
                                Text(String(format: "%.1f", Double(restaurant.rating) ?? 0.0))
                                    .font(.headline)
                                    .fontWeight(.medium)
                            }
                            
                            Text("(\(restaurant.totalOrders) orders)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // Restaurant Details
                    VStack(alignment: .leading, spacing: 8) {
                        Label(restaurant.address, systemImage: "location.fill")
                            .font(.body)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            Label("\(restaurant.deliveryFee == 0 ? "Free" : "$\(String(format: "%.2f", Double(restaurant.deliveryFee) / 100.0))")", systemImage: "delivery.car.fill")
                                .font(.body)
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            if restaurant.deliveryFee > 0 {
                                Label("Est. 30 min", systemImage: "clock.fill")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                    
                    Divider()
                    
                    // Menu Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Menu")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        if isLoading {
                            ProgressView("Loading menu...")
                                .frame(maxWidth: .infinity)
                        } else if let errorMessage = errorMessage {
                            VStack(spacing: 12) {
                                Image(systemName: "exclamationmark.triangle")
                                    .font(.system(size: 30))
                                    .foregroundColor(.orange)
                                Text("Failed to load menu")
                                    .font(.headline)
                                Text(errorMessage)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                
                                Button("Retry") {
                                    loadMenu()
                                }
                                .buttonStyle(.borderedProminent)
                            }
                            .padding()
                        } else if menuItems.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "menucard")
                                    .font(.system(size: 30))
                                    .foregroundColor(.gray)
                                Text("No menu items available")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                        } else {
                            LazyVStack(spacing: 12) {
                                ForEach(menuItems) { item in
                                    MenuItemCard(item: item) {
                                        // Handle item selection - add to cart
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadMenu()
        }
    }
    
    private func loadMenu() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                menuItems = try await restaurantService.fetchRestaurantMenu(id: restaurant.id)
                isLoading = false
            } catch {
                errorMessage = error.localizedDescription
                isLoading = false
            }
        }
    }
}

struct MenuItemCard: View {
    let item: MenuItem
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Item Image
                AsyncImage(url: URL(string: item.imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.3))
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundColor(.gray)
                        )
                }
                .frame(width: 80, height: 80)
                .clipped()
                .cornerRadius(8)
                
                // Item Details
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.name.en)
                        .font(.headline)
                        .fontWeight(.medium)
                    
                    Text(item.description.en)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    Spacer()
                    
                    Text("$\(String(format: "%.2f", Double(item.price) ?? 0.0))")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.blue)
                }
                
                Spacer()
                
                // Availability Badge
                if !item.isAvailable {
                    Text("Unavailable")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red.opacity(0.1))
                        .foregroundColor(.red)
                        .cornerRadius(6)
                }
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.gray)
                    .font(.caption)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(!item.isAvailable)
    }
}

struct RestaurantDetailView_Previews: PreviewProvider {
    static var previews: some View {
        RestaurantDetailView(restaurant: Restaurant(
            id: "1",
            name: BilingualString(tr: "Test Restoran", en: "Test Restaurant"),
            description: BilingualString(tr: "Test Açıklama", en: "Test Description"),
            logo: nil,
            address: "123 Test St",
            cuisineTags: ["Turkish", "Grill"],
            isActive: true,
            isApproved: true,
            rating: "4.5",
            totalOrders: 100,
            deliveryFee: 299,
            taxRate: "0.08",
            lat: nil,
            lng: nil,
            createdAt: "2026-01-01T00:00:00Z"
        ))
    }
}
