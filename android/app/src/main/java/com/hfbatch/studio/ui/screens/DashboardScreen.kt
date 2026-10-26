package com.hfbatch.studio.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.hfbatch.studio.data.db.BatchJobEntity
import com.hfbatch.studio.data.db.BatchResultEntity

@Composable
fun DashboardScreen(
    jobs: List<BatchJobEntity>,
    results: List<BatchResultEntity>,
    onNavigateToQueue: () -> Unit
) {
    val total = jobs.size
    val completed = jobs.count { it.status == "COMPLETED" }
    val failed = jobs.count { it.status.startsWith("FAILED_") }
    val queued = jobs.count { it.status == "QUEUED" || it.status == "PAUSED" }
    val active = jobs.count { it.status == "GENERATING" || it.status == "PREPARING" || it.status == "DOWNLOADING" }

    val successRate = if (completed + failed > 0) ((completed.toDouble() / (completed + failed)) * 100).toInt() else 100

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "HF Batch Studio",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )
        Text(
            text = "Personal native batch runner for Hugging Face Gradio Spaces",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
        )

        // Summary Card
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Performance & Reliability Metrics", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    MetricItem(label = "Success Rate", value = "$successRate%")
                    MetricItem(label = "Completed", value = "$completed")
                    MetricItem(label = "In Queue", value = "$queued")
                    MetricItem(label = "Active", value = "$active")
                }
            }
        }

        // Active Batch Card
        if (active > 0) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Batch Pipeline Active", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    Text("$active worker tasks currently executing.", fontSize = 13.sp)
                    Button(
                        onClick = onNavigateToQueue,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("View Live Queue", color = MaterialTheme.colorScheme.onPrimary)
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
    }
}
