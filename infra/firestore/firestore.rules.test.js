"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * Shoplift Firestore Security Rules Unit Tests
 */
describe("Firestore Security Rules", () => {
    let testEnv;
    const PROJECT_ID = "shoplift-test-project";
    const RULES_PATH = (0, path_1.resolve)(__dirname, "firestore.rules");
    beforeAll(async () => {
        testEnv = await (0, rules_unit_testing_1.initializeTestEnvironment)({
            projectId: PROJECT_ID,
            firestore: {
                rules: (0, fs_1.readFileSync)(RULES_PATH, "utf8"),
                host: "localhost",
                port: 8080,
            },
        });
    });
    afterAll(async () => {
        await testEnv.cleanup();
    });
    beforeEach(async () => {
        await testEnv.clearFirestore();
    });
    // --- Users Collection Tests ---
    describe("Users collection", () => {
        it("allows a user to read their own document", async () => {
            const alice = testEnv.authenticatedContext("alice");
            await (0, rules_unit_testing_1.assertSucceeds)(alice.firestore().doc("users/alice").get());
        });
        it("denies a user from reading another user's document", async () => {
            const alice = testEnv.authenticatedContext("alice");
            await (0, rules_unit_testing_1.assertFails)(alice.firestore().doc("users/bob").get());
        });
        it("allows a user to write their own document", async () => {
            const alice = testEnv.authenticatedContext("alice");
            await (0, rules_unit_testing_1.assertSucceeds)(alice.firestore().doc("users/alice").set({ name: "Alice" }));
        });
        it("allows super_admin to read any user document", async () => {
            const admin = testEnv.authenticatedContext("admin", {
                role: "super_admin",
            });
            await (0, rules_unit_testing_1.assertSucceeds)(admin.firestore().doc("users/alice").get());
        });
    });
    // --- Restaurants Collection Tests ---
    describe("Restaurants collection", () => {
        const activeRestaurantPath = "restaurants/rest_active";
        const inactiveRestaurantPath = "restaurants/rest_inactive";
        beforeEach(async () => {
            // Set up initial data as admin
            await testEnv.withSecurityRulesDisabled(async (context) => {
                await context
                    .firestore()
                    .doc(activeRestaurantPath)
                    .set({ isActive: true });
                await context
                    .firestore()
                    .doc(inactiveRestaurantPath)
                    .set({ isActive: false });
            });
        });
        it("allows anyone (unauthenticated) to read an active restaurant", async () => {
            const publicUser = testEnv.unauthenticatedContext();
            await (0, rules_unit_testing_1.assertSucceeds)(publicUser.firestore().doc(activeRestaurantPath).get());
        });
        it("denies anyone (unauthenticated) from reading an inactive restaurant", async () => {
            const publicUser = testEnv.unauthenticatedContext();
            await (0, rules_unit_testing_1.assertFails)(publicUser.firestore().doc(inactiveRestaurantPath).get());
        });
        it("allows restaurant_admin to write to their specific restaurant", async () => {
            const restAdmin = testEnv.authenticatedContext("admin_123", {
                role: "restaurant_admin",
                restaurantId: "rest_active",
            });
            await (0, rules_unit_testing_1.assertSucceeds)(restAdmin
                .firestore()
                .doc(activeRestaurantPath)
                .update({ name: "New Name" }));
        });
        it("denies restaurant_admin from writing to a different restaurant", async () => {
            const restAdmin = testEnv.authenticatedContext("admin_123", {
                role: "restaurant_admin",
                restaurantId: "rest_active",
            });
            await (0, rules_unit_testing_1.assertFails)(restAdmin
                .firestore()
                .doc(inactiveRestaurantPath)
                .update({ name: "New Name" }));
        });
        it("allows super_admin to perform any action on restaurants", async () => {
            const admin = testEnv.authenticatedContext("admin", {
                role: "super_admin",
            });
            await (0, rules_unit_testing_1.assertSucceeds)(admin.firestore().doc(inactiveRestaurantPath).get());
            await (0, rules_unit_testing_1.assertSucceeds)(admin
                .firestore()
                .doc(inactiveRestaurantPath)
                .set({ name: "Force Update" }));
        });
    });
});
