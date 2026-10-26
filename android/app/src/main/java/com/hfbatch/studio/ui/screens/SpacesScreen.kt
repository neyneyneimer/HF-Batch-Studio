package com.hfbatch.studio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hfbatch.studio.data.db.SpaceEntity

@Composable
fun SpacesScreen(
    spaces: List<SpaceEntity>,
    onAddSpace: (name: String, url: String) -> Unit,
    onDeleteSpace: (SpaceEntity) -> Unit
) {
    var showDialog by remember { mutableStateOf(false) }
    var spaceName by remember { mutableStateOf("") }
    var spaceUrl by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Gradio Spaces (${spaces.size})", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Button(onClick = { showDialog = true }) {
                Text("Add Space")
            }
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(spaces, key = { it.id }) { space ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(space.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text(space.type.uppercase(), fontSize = 10.sp, color = MaterialTheme.colorScheme.primary)
                        }
                        Text(space.url, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Text("Endpoint: ${space.selectedEndpoint} (${space.status})", fontSize = 11.sp)
                        Text(space.description, fontSize = 12.sp, maxLines = 2)

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            if (!space.isBuiltin) {
                                TextButton(onClick = { onDeleteSpace(space) }) {
                                    Text("Remove", color = MaterialTheme.colorScheme.error)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text("Discover / Map Gradio Space") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = spaceName,
                        onValueChange = { spaceName = it },
                        label = { Text("Space Name") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = spaceUrl,
                        onValueChange = { spaceUrl = it },
                        label = { Text("Space URL or ID") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (spaceName.isNotEmpty() && spaceUrl.isNotEmpty()) {
                            onAddSpace(spaceName, spaceUrl)
                            spaceName = ""
                            spaceUrl = ""
                            showDialog = false
                        }
                    }
                ) {
                    Text("Add")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}
