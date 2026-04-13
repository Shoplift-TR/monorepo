import { db } from "./client.js";
import { restaurants, menuItems } from "./schema/index.js";
import { sql, eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const RESTAURANT_DATA = [
  {
    slug: "surrender-and-eat",
    name: { tr: "Surrender and Eat", en: "Surrender and Eat" },
    description: {
      tr: "En iyi doner, tavuk ve burger deneyimi için tek adres.",
      en: "Your go-to spot for the best doner, chicken and burgers on campus.",
    },
    cuisineTags: ["Doner", "Burger", "Chicken"],
    deliveryFee: 0,
    address: "Famagusta, TRNC",
    logo: null,
    lat: 35.1264,
    lng: 33.9401,
  },
  {
    slug: "hatay-doner",
    name: { tr: "Hatay Döner", en: "Hatay Doner" },
    description: {
      tr: "Geleneksel Hatay usulü döner ve tavuk çeşitleri.",
      en: "Traditional Hatay-style doner and chicken dishes.",
    },
    cuisineTags: ["Doner", "Chicken"],
    deliveryFee: 0,
    address: "Famagusta, TRNC",
    logo: null,
    lat: 35.1271,
    lng: 33.9415,
  },
  {
    slug: "big-bites",
    name: { tr: "Big Bites", en: "Big Bites" },
    description: {
      tr: "Büyük porsiyonlar, büyük lezzetler. Burger ve tavuk kanatları uzmanı.",
      en: "Big portions, big flavours. Specialists in burgers and chicken wings.",
    },
    cuisineTags: ["Burger", "Chicken", "Wings"],
    deliveryFee: 0,
    address: "Famagusta, TRNC",
    logo: null,
    lat: 35.1258,
    lng: 33.9388,
  },
  {
    slug: "lihman",
    name: { tr: "Lihman", en: "Lihman" },
    description: {
      tr: "Döner, tavuk ve burger ile dolu doyurucu öğünler.",
      en: "Satisfying meals packed with doner, chicken and burgers.",
    },
    cuisineTags: ["Doner", "Burger", "Chicken"],
    deliveryFee: 0,
    address: "Famagusta, TRNC",
    logo: null,
    lat: 35.128,
    lng: 33.9425,
  },
  {
    slug: "raccoon",
    name: { tr: "Raccoon", en: "Raccoon" },
    description: {
      tr: "Kampüsün en sevilen fast food noktası.",
      en: "The most loved fast food spot on campus.",
    },
    cuisineTags: ["Burger", "Chicken", "Wings"],
    deliveryFee: 0,
    address: "Famagusta, TRNC",
    logo: null,
    lat: 35.1247,
    lng: 33.937,
  },
  {
    slug: "ennys-bistro",
    name: { tr: "Enny's Bistro", en: "Enny's Bistro" },
    description: {
      tr: "Otantik Batı Afrika mutfağı. Jollof pilav ve kızarmış tavuk.",
      en: "Authentic West African cuisine. Jollof rice and fried chicken.",
    },
    cuisineTags: ["African", "Rice"],
    deliveryFee: 70,
    address: "Famagusta, TRNC",
    logo: null,
    lat: 35.129,
    lng: 33.944,
  },
];

const STANDARD_MENU = [
  {
    name: { tr: "Tavuk Döner (Porsiyon)", en: "Chicken Doner (Portion)" },
    description: {
      tr: "Izgara tavuk döner, pilav ve salata ile servis edilir.",
      en: "Grilled chicken doner served with rice and salad.",
    },
    price: 180,
    category: "Doner",
    imageUrl:
      "https://images.unsplash.com/photo-1561050501-a2b3c6e1a914?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Et Döner (Porsiyon)", en: "Meat Doner (Portion)" },
    description: {
      tr: "Geleneksel et döner, pilav ve salata ile servis edilir.",
      en: "Traditional meat doner served with rice and salad.",
    },
    price: 210,
    category: "Doner",
    imageUrl:
      "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Tavuk Dürüm", en: "Chicken Wrap" },
    description: {
      tr: "Izgara tavuk, sebze ve özel sos ile lavaş ekmeğinde.",
      en: "Grilled chicken with vegetables and special sauce in flatbread.",
    },
    price: 150,
    category: "Doner",
    imageUrl:
      "https://images.unsplash.com/photo-1561050501-a2b3c6e1a914?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Klasik Burger", en: "Classic Burger" },
    description: {
      tr: "Dana burger, marul, domates, turşu ve özel sos ile.",
      en: "Beef burger with lettuce, tomato, pickles and special sauce.",
    },
    price: 200,
    category: "Burger",
    imageUrl:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Tavuk Burger", en: "Chicken Burger" },
    description: {
      tr: "Çıtır tavuk fileto, coleslaw ve özel sos ile.",
      en: "Crispy chicken fillet with coleslaw and special sauce.",
    },
    price: 185,
    category: "Burger",
    imageUrl:
      "https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Çift Etli Burger", en: "Double Smash Burger" },
    description: {
      tr: "İki adet dana köfte, cheddar peyniri ve özel sos ile.",
      en: "Two beef patties with cheddar cheese and special sauce.",
    },
    price: 260,
    category: "Burger",
    imageUrl:
      "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Tavuk ve Patates", en: "Chicken and Chips" },
    description: {
      tr: "Çıtır tavuk parçaları ve altın sarısı patates kızartması.",
      en: "Crispy chicken pieces and golden french fries.",
    },
    price: 195,
    category: "Chicken",
    imageUrl:
      "https://images.unsplash.com/photo-1562967914-608f82629710?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Tavuk Kanatları (6 Adet)", en: "Chicken Wings (6 pcs)" },
    description: {
      tr: "Baharatlı veya BBQ soslu çıtır tavuk kanatları.",
      en: "Crispy chicken wings in spicy or BBQ sauce.",
    },
    price: 170,
    category: "Chicken",
    imageUrl:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Tavuk Kanatları (12 Adet)", en: "Chicken Wings (12 pcs)" },
    description: {
      tr: "Büyük porsiyon çıtır tavuk kanatları, sos seçiminizle.",
      en: "Large portion crispy chicken wings with your choice of sauce.",
    },
    price: 290,
    category: "Chicken",
    imageUrl:
      "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Coca-Cola (30 cl)", en: "Coca-Cola (30 cl)" },
    description: {
      tr: "Soğuk Coca-Cola.",
      en: "Ice cold Coca-Cola.",
    },
    price: 35,
    category: "Drinks",
    imageUrl:
      "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Pepsi (30 cl)", en: "Pepsi (30 cl)" },
    description: {
      tr: "Soğuk Pepsi.",
      en: "Ice cold Pepsi.",
    },
    price: 35,
    category: "Drinks",
    imageUrl:
      "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Sprite (30 cl)", en: "Sprite (30 cl)" },
    description: {
      tr: "Soğuk Sprite.",
      en: "Ice cold Sprite.",
    },
    price: 35,
    category: "Drinks",
    imageUrl:
      "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop",
  },
];

const ENNYS_MENU = [
  {
    name: { tr: "Jollof Pilav ve Tavuk", en: "Jollof Rice and Chicken" },
    description: {
      tr: "Geleneksel Batı Afrika usulü baharatlı jollof pilav, izgara veya kızartma tavuk ile servis edilir.",
      en: "Traditional West African spiced jollof rice served with grilled or fried chicken.",
    },
    price: 320,
    category: "Main",
    imageUrl:
      "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=800&auto=format&fit=crop",
  },
  {
    name: { tr: "Kızarmış Pilav ve Tavuk", en: "Fried Rice and Chicken" },
    description: {
      tr: "Sebzeli kızarmış pilav, çıtır kızarmış tavuk ile servis edilir.",
      en: "Vegetable fried rice served with crispy fried chicken.",
    },
    price: 300,
    category: "Main",
    imageUrl:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&auto=format&fit=crop",
  },
];

async function seed() {
  console.log("🌱 Starting seed...");

  const queries = [
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS slug text;",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS delivery_fee numeric DEFAULT '0';",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo text;",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0;",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS health_score integer DEFAULT 100;",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS average_delivery_minutes integer DEFAULT 30;",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();",
    "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();",
    "ALTER TABLE restaurants ALTER COLUMN location DROP NOT NULL;",
    "ALTER TABLE restaurants ALTER COLUMN name_by_lang DROP NOT NULL;",
    "ALTER TABLE restaurants ALTER COLUMN operating_hours DROP NOT NULL;",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT NOW();",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT NOW();",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS food_cost_percent numeric;",
  ];

  for (const q of queries) {
    try {
      await db.execute(sql.raw(q));
    } catch (e: any) {
      console.log(`Skipping: ${q} - ${e.message}`);
    }
  }

  for (const restData of RESTAURANT_DATA) {
    const existing = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.slug, restData.slug))
      .limit(1);

    let restaurantId: string;

    if (existing[0]) {
      restaurantId = existing[0].id;
      // Update coordinates if not set
      await db
        .update(restaurants)
        .set({
          lat: (restData as any).lat.toString(),
          lng: (restData as any).lng.toString(),
        })
        .where(eq(restaurants.id, restaurantId));
      console.log(`⭐ Restaurant already exists: ${restData.name.en}`);
    } else {
      const inserted = await db
        .insert(restaurants)
        .values({
          name: restData.name,
          description: restData.description,
          address: restData.address,
          cuisineTags: restData.cuisineTags,
          isActive: true,
          isApproved: true,
          commissionRate: "0.10",
          maintenanceFee: 0,
          deliveryFee: restData.deliveryFee,
          rating: (Math.random() * 1.5 + 3.5).toFixed(1),
          totalOrders: Math.floor(Math.random() * 500 + 50),
          healthScore: 100,
          averageDeliveryMinutes: restData.slug === "ennys-bistro" ? 40 : 20,
          logo: restData.logo,
          slug: restData.slug,
          lat: (restData as any).lat.toString(),
          lng: (restData as any).lng.toString(),
        })
        .returning({ id: restaurants.id });

      restaurantId = inserted[0].id;
      console.log(`✅ Created restaurant: ${restData.name.en}`);
    }

    const menuToSeed =
      restData.slug === "ennys-bistro" ? ENNYS_MENU : STANDARD_MENU;

    for (let i = 0; i < menuToSeed.length; i++) {
      const item = menuToSeed[i];

      const existingItem = await db
        .select({ id: menuItems.id })
        .from(menuItems)
        .where(eq(menuItems.restaurantId, restaurantId))
        // Note: Simple check here, could be more thorough if needed
        .limit(1);

      if (existingItem.length > 0 && i === 0) {
        console.log(`⏭️  Menu items already exist for: ${restData.name.en}`);
        break;
      }

      await db.insert(menuItems).values({
        restaurantId,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        isAvailable: true,
        modifiers: [],
        displayOrder: i + 1,
      });
    }

    console.log(`✅ Menu seeded for: ${restData.name.en}`);
  }

  console.log("🎉 Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
