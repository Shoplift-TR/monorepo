"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
// Connect to the local emulators
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const app = (0, app_1.initializeApp)({ projectId: "shoplift-dev" });
const db = (0, firestore_1.getFirestore)(app);
const auth = (0, auth_1.getAuth)(app);
async function seed() {
    console.log("Starting database seed...");
    // 1. Create 3 Test Users (Auth + Firestore)
    const users = [
        {
            uid: "customer123",
            email: "customer@test.com",
            password: "password123",
            displayName: "Test Customer",
            role: "customer",
        },
        {
            uid: "admin123",
            email: "admin@test.com",
            password: "password123",
            displayName: "Restaurant Admin",
            role: "restaurant_admin",
            restaurantId: "rest_active",
        },
        {
            uid: "superadmin123",
            email: "superadmin@test.com",
            password: "password123",
            displayName: "Super Admin",
            role: "super_admin",
        },
    ];
    for (const user of users) {
        try {
            await auth.createUser({
                uid: user.uid,
                email: user.email,
                password: user.password,
                displayName: user.displayName,
            });
            const claims = { role: user.role };
            if (user.restaurantId) {
                claims.restaurantId = user.restaurantId;
            }
            await auth.setCustomUserClaims(user.uid, claims);
            await db.collection("users").doc(user.uid).set({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                createdAt: new Date().toISOString(),
            });
            console.log(`Created user: ${user.email} (${user.role})`);
        }
        catch (e) {
            if (e.code !== "auth/uid-already-exists") {
                console.error(`Failed to create user ${user.email}:`, e);
            }
        }
    }
    // 2. Create 2 Test Restaurants (Active and Inactive)
    const activeRestId = "rest_active";
    const inactiveRestId = "rest_inactive";
    const restaurantData = {
        [activeRestId]: {
            name: "Sunny Side Burger",
            description: {
                en: "The best burgers in Lefke.",
                tr: "Lefke'nin en iyi burgerleri.",
            },
            isActive: true,
            commissionRate: 15, // 15%
            location: new firestore_1.GeoPoint(35.1149, 32.848), // Lefke roughly
            operatingHours: {
                monday: { open: "09:00", close: "22:00" },
                // Add more realistically if needed
            },
            cuisineTags: ["burgers", "fast-food"],
        },
        [inactiveRestId]: {
            name: "Closed Pizzeria",
            description: {
                en: "Currently closed for renovation.",
                tr: "Şu anda tadilat nedeniyle kapalı.",
            },
            isActive: false,
            commissionRate: 10,
            location: new firestore_1.GeoPoint(35.114, 32.85),
            operatingHours: {},
            cuisineTags: ["pizza"],
        },
    };
    for (const [id, data] of Object.entries(restaurantData)) {
        await db.collection("restaurants").doc(id).set(data);
        console.log(`Created restaurant: ${id} (Active: ${data.isActive})`);
        // Add 5 menu items across 2 categories
        const menuItems = [
            { id: "item1", name: { en: "Classic Burger", tr: "Klasik Burger" }, price: 150, category: "Mains" },
            { id: "item2", name: { en: "Cheeseburger", tr: "Çizburger" }, price: 180, category: "Mains" },
            { id: "item3", name: { en: "Double Burger", tr: "Duble Burger" }, price: 250, category: "Mains" },
            { id: "item4", name: { en: "Fries", tr: "Patates Kızartması" }, price: 60, category: "Sides" },
            { id: "item5", name: { en: "Onion Rings", tr: "Soğan Halkası" }, price: 70, category: "Sides" },
        ];
        for (const item of menuItems) {
            await db.collection(`restaurants/${id}/menu`).doc(item.id).set({
                name: item.name,
                price: item.price,
                category: item.category,
                isActive: true,
            });
        }
        console.log(`Created 5 menu items for restaurant: ${id}`);
    }
    // 3. Create 3 Test Orders
    const orders = [
        {
            id: "order1_pending",
            userId: "customer123",
            restaurantId: activeRestId,
            status: "PENDING",
            totalAmount: 210, // Burger + Fries
            createdAt: new Date().toISOString(),
        },
        {
            id: "order2_out_for_delivery",
            userId: "customer123",
            restaurantId: activeRestId,
            status: "OUT_FOR_DELIVERY",
            totalAmount: 150,
            createdAt: new Date().toISOString(),
            routeWaypoints: [
                new firestore_1.GeoPoint(35.1149, 32.848),
                new firestore_1.GeoPoint(35.1145, 32.849),
            ],
        },
        {
            id: "order3_delivered",
            userId: "customer123",
            restaurantId: activeRestId,
            status: "DELIVERED",
            totalAmount: 320,
            createdAt: new Date().toISOString(),
        },
    ];
    for (const order of orders) {
        await db.collection("orders").doc(order.id).set(order);
        console.log(`Created order: ${order.id} (${order.status})`);
    }
    // 4. Create 1 Active Promo Code
    await db.collection("promotions").doc("WELCOME10").set({
        code: "WELCOME10",
        type: "percent",
        value: 10,
        isActive: true,
        platformWide: true,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    });
    console.log("Created promo code: WELCOME10");
    console.log("Seed completed successfully!");
    process.exit(0);
}
seed().catch(console.error);
