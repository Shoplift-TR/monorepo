import { supabase } from "./supabase";

export async function seedRestaurants() {
  const restaurants = [
    {
      name: { en: "Burger Palace", tr: "Burger Sarayı" },
      description: {
        en: "The best burgers in town with fresh ingredients",
        tr: "Taze malzemelerle şehrin en iyi burgerları",
      },
      address: "123 Main St, Istanbul",
      cuisine_tags: ["american", "burger", "fast-food"],
      logo_url:
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=100&h=100&fit=crop",
      operating_hours: {
        monday: { open: "11:00", close: "22:00" },
        tuesday: { open: "11:00", close: "22:00" },
        wednesday: { open: "11:00", close: "22:00" },
        thursday: { open: "11:00", close: "22:00" },
        friday: { open: "11:00", close: "23:00" },
        saturday: { open: "11:00", close: "23:00" },
        sunday: { open: "12:00", close: "22:00" },
      },
      location: `POINT(${28.9784} ${41.0082})`,
      is_active: true,
      is_approved: true,
      commission_rate: 0.1,
      rating: 4.5,
      total_orders: 156,
    },
    {
      name: { en: "Pizza Express", tr: "Pizza Ekspres" },
      description: {
        en: "Authentic Italian pizza with wood-fired oven",
        tr: "Odun fırınlı otantik İtalyan pizza",
      },
      address: "456 Oak Ave, Istanbul",
      cuisine_tags: ["italian", "pizza", "pasta"],
      logo_url:
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=100&h=100&fit=crop",
      operating_hours: {
        monday: { open: "12:00", close: "23:00" },
        tuesday: { open: "12:00", close: "23:00" },
        wednesday: { open: "12:00", close: "23:00" },
        thursday: { open: "12:00", close: "23:00" },
        friday: { open: "12:00", close: "00:00" },
        saturday: { open: "12:00", close: "00:00" },
        sunday: { open: "12:00", close: "23:00" },
      },
      location: `POINT(${28.9684} ${41.0182})`,
      is_active: true,
      is_approved: true,
      commission_rate: 0.12,
      rating: 4.7,
      total_orders: 243,
    },
    {
      name: { en: "Sushi Master", tr: "Sushi Ustası" },
      description: {
        en: "Fresh sushi and Japanese cuisine",
        tr: "Taze sushi ve Japon mutfağı",
      },
      address: "789 Pine St, Istanbul",
      cuisine_tags: ["japanese", "sushi", "seafood"],
      logo_url:
        "https://images.unsplash.com/photo-1579484449566-4a5e9b6b6a6a?w=100&h=100&fit=crop",
      operating_hours: {
        monday: { open: "17:00", close: "23:00" },
        tuesday: { open: "17:00", close: "23:00" },
        wednesday: { open: "17:00", close: "23:00" },
        thursday: { open: "17:00", close: "23:00" },
        friday: { open: "17:00", close: "00:00" },
        saturday: { open: "17:00", close: "00:00" },
        sunday: { open: "17:00", close: "23:00" },
      },
      location: `POINT(${28.9884} ${41.0282})`,
      is_active: true,
      is_approved: true,
      commission_rate: 0.15,
      rating: 4.8,
      total_orders: 89,
    },
  ];

  for (const restaurant of restaurants) {
    const { error } = await supabase.from("restaurants").insert(restaurant);
    if (error) {
      console.error("Error inserting restaurant:", error);
    } else {
      console.log("Inserted restaurant:", restaurant.name.en);
    }
  }
}

export async function seedMenuItems() {
  const menuItems = [
    // Burger Palace items
    {
      restaurant_id: 1, // Assuming Burger Palace has ID 1
      name: { en: "Classic Burger", tr: "Klasik Burger" },
      description: {
        en: "Juicy beef patty with lettuce, tomato, and our special sauce",
        tr: "Taze sığır eti, marul, domates ve özel sosumuz",
      },
      price: 89.99,
      category: "burgers",
      image_url:
        "https://images.unsplash.com/photo-1568901346376-44cba0456d31?w=300&h=200&fit=crop",
      is_available: true,
      modifiers: [
        { name: { en: "Extra Cheese", tr: "Ekstra Peynir" }, price: 5.0 },
        { name: { en: "Bacon", tr: "Pastırma" }, price: 8.0 },
        { name: { en: "Extra Patty", tr: "Ekstra Köfte" }, price: 15.0 },
      ],
      display_order: 1,
    },
    {
      restaurant_id: 1,
      name: { en: "Cheese Fries", tr: "Peynirli Patates" },
      description: {
        en: "Crispy fries topped with melted cheese and bacon bits",
        tr: "Erikli patates, eritilmiş peynir ve pastırma parçaları",
      },
      price: 34.99,
      category: "sides",
      image_url:
        "https://images.unsplash.com/photo-1630383217693-87e2611b5adc?w=300&h=200&fit=crop",
      is_available: true,
      display_order: 2,
    },
    // Pizza Express items
    {
      restaurant_id: 2, // Assuming Pizza Express has ID 2
      name: { en: "Margherita Pizza", tr: "Margherita Pizza" },
      description: {
        en: "Fresh mozzarella, tomato sauce, and basil on our wood-fired crust",
        tr: "Taze mozzarella, domates sosu ve fesleğen",
      },
      price: 119.99,
      category: "pizza",
      image_url:
        "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=300&h=200&fit=crop",
      is_available: true,
      modifiers: [
        { name: { en: "Extra Cheese", tr: "Ekstra Peynir" }, price: 10.0 },
        { name: { en: "Extra Toppings", tr: "Ekstra Malzeme" }, price: 15.0 },
      ],
      display_order: 1,
    },
    // Sushi Master items
    {
      restaurant_id: 3, // Assuming Sushi Master has ID 3
      name: { en: "California Roll", tr: "California Rulo" },
      description: {
        en: "Crab, avocado, and cucumber roll",
        tr: "Yengeç, avokado ve salatalık rulo",
      },
      price: 89.99,
      category: "rolls",
      image_url:
        "https://images.unsplash.com/photo-1579584449566-4a5e9b6b6a6a?w=300&h=200&fit=crop",
      is_available: true,
      display_order: 1,
    },
  ];

  for (const item of menuItems) {
    const { error } = await supabase.from("menu_items").insert(item);
    if (error) {
      console.error("Error inserting menu item:", error);
    } else {
      console.log("Inserted menu item:", item.name.en);
    }
  }
}

export async function seedAllData() {
  console.log("Seeding restaurants...");
  await seedRestaurants();

  console.log("Seeding menu items...");
  await seedMenuItems();

  console.log("Data seeding completed!");
}
