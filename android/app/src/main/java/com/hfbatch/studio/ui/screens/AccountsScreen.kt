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
import com.hfbatch.studio.data.db.AccountEntity

@Composable
fun AccountsScreen(
    accounts: List<AccountEntity>,
    onAddAccount: (name: String, token: String) -> Unit,
    onDeleteAccount: (AccountEntity) -> Unit
) {
    var showDialog by remember { mutableStateOf(false) }
    var accountName by remember { mutableStateOf("") }
    var accountToken by remember { mutableStateOf("") }

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
            Text("HF Accounts (${accounts.size})", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Button(onClick = { showDialog = true }) {
                Text("Add Account")
            }
        }

        Text(
            "Tokens are stored hardware-encrypted in Android Keystore via EncryptedSharedPreferences (AES256-GCM). Free GPU quotas are strictly respected without account cycling.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
        )

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(accounts, key = { it.id }) { acc ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(acc.name, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                            Text(acc.quotaStatus, fontSize = 11.sp, color = if (acc.quotaStatus == "OK") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error)
                        }
                        Text("Token: ${acc.tokenMasked}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                            TextButton(onClick = { onDeleteAccount(acc) }) {
                                Text("Delete", color = MaterialTheme.colorScheme.error)
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
            title = { Text("Add Hugging Face Account") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = accountName,
                        onValueChange = { accountName = it },
                        label = { Text("Account Label (e.g. Personal HF)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = accountToken,
                        onValueChange = { accountToken = it },
                        label = { Text("User Access Token (hf_...)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (accountName.isNotEmpty() && accountToken.startsWith("hf_")) {
                            onAddAccount(accountName, accountToken)
                            accountName = ""
                            accountToken = ""
                            showDialog = false
                        }
                    }
                ) {
                    Text("Save to Keystore")
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
