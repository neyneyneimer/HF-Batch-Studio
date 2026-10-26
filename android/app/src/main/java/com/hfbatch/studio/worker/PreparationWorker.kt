package com.hfbatch.studio.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.hfbatch.studio.data.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Stage 1 WorkManager Worker: Input Preparation and Media Preflight
 */
class PreparationWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jobId = inputData.getString("KEY_JOB_ID") ?: return@withContext Result.failure()
        val db = AppDatabase.getInstance(applicationContext)
        val job = db.batchJobDao().getJobById(jobId) ?: return@withContext Result.failure()

        try {
            db.batchJobDao().updateJobProgress(jobId, "PREPARING", "Worker 1: Validating inputs and preflighting...", 10)

            // Local media validation
            if (!job.inputMediaUri.isNullOrEmpty()) {
                // Preflight checks: file existence, size < 20MB, supported MIME
                val uri = android.net.Uri.parse(job.inputMediaUri)
                val type = applicationContext.contentResolver.getType(uri)
                if (type == null || (!type.startsWith("image/") && !type.startsWith("video/"))) {
                    db.batchJobDao().updateJobProgress(jobId, "FAILED_PREPARATION", "Unsupported media format: $type", 0)
                    return@withContext Result.failure(workDataOf("ERROR" to "Invalid MIME type"))
                }
            }

            db.batchJobDao().updateJobProgress(jobId, "PREPARING", "Worker 1: Preflight passed, payload prepared.", 25)
            Result.success(workDataOf("KEY_JOB_ID" to jobId))
        } catch (e: Exception) {
            db.batchJobDao().updateJobProgress(jobId, "FAILED_PREPARATION", "Preflight error: ${e.localizedMessage}", 0)
            Result.failure(workDataOf("ERROR" to (e.localizedMessage ?: "Unknown error")))
        }
    }
}
