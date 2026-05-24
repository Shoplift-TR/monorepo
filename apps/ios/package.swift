// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Shoplift",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(name: "Shoplift", targets: ["Shoplift"]),
        .executable(name: "ShopliftApp", targets: ["ShopliftApp"])
    ],
    dependencies: [],
    targets: [
        .target(
            name: "Shoplift",
            dependencies: [],
            path: ".",
            exclude: [".agent", "package.swift", "Sources", "Tests"],
            sources: ["core", "views"]
        ),
        .executableTarget(
            name: "ShopliftApp",
            dependencies: ["Shoplift"],
            path: "Sources/ShopliftApp"
        ),
        .testTarget(
            name: "ShopliftTests",
            dependencies: ["Shoplift"],
            path: "Tests/ShopliftTests"
        )
    ]
)
