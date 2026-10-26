package com.hfbatch.studio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hfbatch.studio.data.db.BatchJobEntity

@Composable
fun QueueScreen(
    jobs: List<BatchJobEntity>,
    onCancelJob: (String) -> Unit,
    onRetryJob: (String) -> Unit,
    onPauseQueue: () -> Unit,
    onClearCompleted: () -> Unit
) {
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
            Text("Batch Queue (${jobs.size})", fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onPauseQueue) {
                    Text("Pause")
                }
                OutlinedButton(onClick = onClearCompleted) {
                    Text("Clear")
                }
            }
        }

        if (jobs.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Queue is empty. Dispatch jobs from Spaces or Profiles.", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f))
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(jobs, key = { it.id }) { job ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(job.status, fontWeight = FontWeight.Bold, color = getStatusColor(job.status))
                                Text("Seed: ${job.seed}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            }
                            Text(job.prompt, maxLines = 2, fontSize = 13.sp)
                            if (job.progress > 0) {
                                LinearProgressIndicator(
                                    progress = { job.progress / 100f },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            Text(job.stageMessage, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.End
                            ) {
                                if (job.status.startsWith("FAILED_")) {
                                    TextButton(onClick = { onRetryJob(job.id) }) {
                                        Text("Retry")
                                    }
                                }
                                if (job.status == "QUEUED" || job.status == "GENERATING" || job.status == "PREPARING") {
                                    TextButton(onClick = { onCancelJob(job.id) }) {
                                        Text("Cancel")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun getStatusColor(status: String) = when {
    status == "COMPLETED" -> MaterialTheme.colorScheme.primary
    status.startsWith("FAILED_") -> MaterialTheme.colorScheme.error
    status == "GENERATING" || status == "PREPARING" -> MaterialTheme.colorScheme.tertiary
    else -> MaterialTheme.colorScheme.onSurface
}
