package com.shoplift.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.shoplift.app.ui.screens.auth.LoginScreen
import com.shoplift.app.ui.screens.restaurant.RestaurantListScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ShopliftApp()
        }
    }
}

@Composable
private fun ShopliftApp() {
    val navController = rememberNavController()

    Surface(
        modifier = Modifier,
        color = MaterialTheme.colorScheme.background
    ) {
        NavHost(navController = navController, startDestination = "login") {
            composable("login") {
                LoginScreen(navController = navController)
            }
            composable("register") {
                Text("Registration screen scaffold pending")
            }
            composable("restaurants") {
                RestaurantListScreen(navController = navController)
            }
        }
    }
}
