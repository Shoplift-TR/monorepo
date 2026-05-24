import SwiftUI

struct RestaurantListView: View {
    @StateObject private var restaurantService = RestaurantService()
    @State private var selectedCuisine: String?
    @State private var searchText = ""
    
    private var filteredRestaurants: [Restaurant] {
        var filtered = restaurantService.restaurants
        
        if !searchText.isEmpty {
            filtered = filtered.filter { restaurant in
                restaurant.name.en.lowercased().contains(searchText.lowercased()) ||
                restaurant.name.tr.lowercased().contains(searchText.lowercased())
            }
        }
        
        if let cuisine = selectedCuisine {
            filtered = filtered.filter { $0.cuisineTags.contains(cuisine) }
        }
        
        return filtered
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                if restaurantService.isLoading {
                    ProgressView("Loading restaurants...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let errorMessage = restaurantService.errorMessage {
                    VStack(spacing: 16) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 50))
                            .foregroundColor(.orange)
                        Text("Error")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                        
                        Button("Retry") {
                            Task {
                                await restaurantService.fetchRestaurants()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                } else if filteredRestaurants.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        Text("No Restaurants Found")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("Try adjusting your filters or search")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(filteredRestaurants) { restaurant in
                                NavigationLink(destination: RestaurantDetailView(restaurant: restaurant)) {
                                    RestaurantCard(restaurant: restaurant)
                                }
                                .buttonStyle(PlainButtonStyle())
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Restaurants")
            .searchable(text: $searchText, prompt: "Search restaurants...")
            .onAppear {
                Task {
                    await restaurantService.fetchRestaurants()
                }
            }
            .refreshable {
                await restaurantService.fetchRestaurants()
            }
        }
    }
}

struct RestaurantCard: View {
    let restaurant: Restaurant
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Restaurant Image
            AsyncImage(url: URL(string: restaurant.logo ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .overlay(
                        Image(systemName: "fork.knife")
                            .font(.system(size: 30))
                            .foregroundColor(.gray)
                    )
            }
            .frame(height: 150)
            .clipped()
            .cornerRadius(12)
            
            // Restaurant Info
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(restaurant.name.en)
                        .font(.headline)
                        .fontWeight(.bold)
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .foregroundColor(.yellow)
                            .font(.caption)
                        Text(String(format: "%.1f", Double(restaurant.rating) ?? 0.0))
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                }
                
                Text(restaurant.description?.en ?? "")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                
                HStack {
                    // Cuisine Tags
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(restaurant.cuisineTags.prefix(3), id: \.self) { cuisine in
                                Text(cuisine)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundColor(.blue)
                                    .cornerRadius(8)
                            }
                        }
                    }
                    
                    Spacer()
                    
                    // Delivery Fee
                    if restaurant.deliveryFee > 0 {
                        Text("Delivery: $\(String(format: "%.2f", Double(restaurant.deliveryFee) / 100.0))")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
    }
}

struct RestaurantListView_Previews: PreviewProvider {
    static var previews: some View {
        RestaurantListView()
    }
}
