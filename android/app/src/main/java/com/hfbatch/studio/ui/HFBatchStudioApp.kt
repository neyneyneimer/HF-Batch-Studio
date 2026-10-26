package com.hfbatch.studio.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.hfbatch.studio.data.db.*
import com.hfbatch.studio.data.repository.*
import com.hfbatch.studio.ui.screens.*
import kotlinx.coroutines.launch

enum class Screen(val title: String) {
    DASHBOARD("Dashboard"),
    SPACES("Spaces"),
    PROFILES("Profiles"),
    QUEUE("Queue"),
    RESULTS("Results"),
    ACCOUNTS("Accounts"),
    SETTINGS("Settings")
}

@Composable
fun HFBatchStudioApp() {
    val context = LocalContext.current
    val db = remember { AppDatabase.getInstance(context) }
    val batchRepo = remember { BatchRepository(context, db) }
    val spaceRepo = remember { SpaceRepository(db) }
    val accountRepo = remember { AccountRepository(context, db) }
    val scope = rememberCoroutineScope()

    var currentScreen by remember { mutableStateOf(Screen.DASHBOARD) }

    val jobs by batchRepo.getAllJobs().collectAsState(initial = emptyList())
    val results by batchRepo.getAllResults().collectAsState(initial = emptyList())
    val spaces by spaceRepo.getAllSpaces().collectAsState(initial = emptyList())
    val profiles by db.jobProfileDao().getAllProfilesFlow().collectAsState(initial = emptyList())
    val accounts by accountRepo.getAllAccounts().collectAsState(initial = emptyList())

    Scaffold(
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    selected = currentScreen == Screen.DASHBOARD,
                    onClick = { currentScreen = Screen.DASHBOARD },
                    icon = { Icon(Icons.Default.Dashboard, contentDescription = "Dashboard") },
                    label = { Text("Home") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.SPACES,
                    onClick = { currentScreen = Screen.SPACES },
                    icon = { Icon(Icons.Default.Public, contentDescription = "Spaces") },
                    label = { Text("Spaces") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.PROFILES,
                    onClick = { currentScreen = Screen.PROFILES },
                    icon = { Icon(Icons.Default.Tune, contentDescription = "Profiles") },
                    label = { Text("Profiles") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.QUEUE,
                    onClick = { currentScreen = Screen.QUEUE },
                    icon = { Icon(Icons.Default.List, contentDescription = "Queue") },
                    label = { Text("Queue") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.RESULTS,
                    onClick = { currentScreen = Screen.RESULTS },
                    icon = { Icon(Icons.Default.PhotoLibrary, contentDescription = "Results") },
                    label = { Text("Gallery") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.ACCOUNTS,
                    onClick = { currentScreen = Screen.ACCOUNTS },
                    icon = { Icon(Icons.Default.Key, contentDescription = "Accounts") },
                    label = { Text("Keys") }
                )
                NavigationBarItem(
                    selected = currentScreen == Screen.SETTINGS,
                    onClick = { currentScreen = Screen.SETTINGS },
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") }
                )
            }
        }
    ) { innerPadding ->
        Surface(modifier = Modifier.padding(innerPadding)) {
            when (currentScreen) {
                Screen.DASHBOARD -> DashboardScreen(
                    jobs = jobs,
                    results = results,
                    onNavigateToQueue = { currentScreen = Screen.QUEUE }
                )
                Screen.SPACES -> SpacesScreen(
                    spaces = spaces,
                    onAddSpace = { name, url ->
                        scope.launch {
                            spaceRepo.saveSpace(
                                SpaceEntity(
                                    id = "space_${System.currentTimeMillis()}",
                                    name = name,
                                    url = url,
                                    directApiUrl = url,
                                    type = "image",
                                    status = "DISCOVERED",
                                    apiProtocol = "v4_stream",
                                    selectedEndpoint = "/predict",
                                    parametersJson = "[]",
                                    description = "Added from app",
                                    lastDiscoveredAt = System.currentTimeMillis()
                                )
                            )
                        }
                    },
                    onDeleteSpace = { space -> scope.launch { spaceRepo.deleteSpace(space) } }
                )
                Screen.PROFILES -> JobProfilesScreen(
                    profiles = profiles,
                    onSelectProfile = {}
                )
                Screen.QUEUE -> QueueScreen(
                    jobs = jobs,
                    onCancelJob = { id -> scope.launch { batchRepo.cancelJob(id) } },
                    onRetryJob = { id -> scope.launch { batchRepo.retryJob(id) } },
                    onPauseQueue = { scope.launch { batchRepo.pauseQueue() } },
                    onClearCompleted = { scope.launch { batchRepo.clearCompleted() } }
                )
                Screen.RESULTS -> ResultsScreen(results = results)
                Screen.ACCOUNTS -> AccountsScreen(
                    accounts = accounts,
                    onAddAccount = { name, token ->
                        scope.launch { accountRepo.addAccount(name, token, isDefault = accounts.isEmpty()) }
                    },
                    onDeleteAccount = { acc -> scope.launch { accountRepo.deleteAccount(acc) } }
                )
                Screen.SETTINGS -> SettingsScreen()
            }
        }
    }
}
