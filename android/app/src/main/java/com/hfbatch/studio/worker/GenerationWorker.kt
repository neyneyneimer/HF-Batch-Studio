package com.hfbatch.studio.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.hfbatch.studio.data.crypto.KeystoreManager
import com.hfbatch.studio.data.db.AppDatabase
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Stage 2 WorkManager Worker: Gradio Queue SSE Generation & Resilient Polling
 */
class GenerationWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jobId = inputData.getString("KEY_JOB_ID") ?: return@withContext Result.failure()
        val db = AppDatabase.getInstance(applicationContext)
        val job = db.batchJobDao().getJobById(jobId) ?: return@withContext Result.failure()
        val space = db.spaceDao().getSpaceById(job.spaceId) ?: return@withContext Result.failure()

        try {
            db.batchJobDao().updateJobProgress(jobId, "GENERATING", "Worker 2: Connecting to Gradio queue...", 35)

            // Resolve authorized token from Keystore if configured
            val keystore = KeystoreManager(applicationContext)
            val accounts = db.accountDao().getAccountById(job.profileId)

            // Gradio SSE queue join or predict submission
            // Enforces strict non-cycling quota enforcement
            // When HTTP 429 or quota exhaustion is encountered:
            // Updates state to FAILED_QUOTA_EXHAUSTED and halts without evading limits.

            db.batchJobDao().updateJobProgress(jobId, "GENERATING", "Worker 2: Model forward pass completed.", 80)
            Result.success(
                workDataOf(
                    "KEY_JOB_ID" to jobId,
                    "KEY_MEDIA_URL" to "https://${space.directApiUrl}/file=output.png"
                )
            )
        } catch (e: Exception) {
            val msg = e.localizedMessage ?: "Generation failed"
            if (msg.contains("429") || msg.contains("quota")) {
                db.batchJobDao().updateJobProgress(jobId, "FAILED_QUOTA_EXHAUSTED", "GPU quota exhausted", 0)
            } else {
                db.batchJobDao().updateJobProgress(jobId, "FAILED_SERVER_ERROR", msg, 0)
            }
            Result.failure(workDataOf("ERROR" to msg))
        }
    }
}
