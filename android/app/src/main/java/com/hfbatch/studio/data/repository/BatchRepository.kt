package com.hfbatch.studio.data.repository

import android.content.Context
import androidx.work.*
import com.hfbatch.studio.data.db.*
import com.hfbatch.studio.worker.DownloadWorker
import com.hfbatch.studio.worker.GenerationWorker
import com.hfbatch.studio.worker.PreparationWorker
import kotlinx.coroutines.flow.Flow

class BatchRepository(
    private val context: Context,
    private val database: AppDatabase
) {
    private val jobDao = database.batchJobDao()
    private val resultDao = database.batchResultDao()
    private val workManager = WorkManager.getInstance(context)

    fun getAllJobs(): Flow<List<BatchJobEntity>> = jobDao.getAllJobsFlow()

    fun getAllResults(): Flow<List<BatchResultEntity>> = resultDao.getAllResultsFlow()

    suspend fun enqueueJobs(jobs: List<BatchJobEntity>) {
        jobDao.insertJobs(jobs)
        for (job in jobs) {
            scheduleWorkChain(job.id)
        }
    }

    private fun scheduleWorkChain(jobId: String) {
        val inputData = workDataOf("KEY_JOB_ID" to jobId)

        val prepRequest = OneTimeWorkRequestBuilder<PreparationWorker>()
            .setInputData(inputData)
            .addTag("job_$jobId")
            .build()

        val genRequest = OneTimeWorkRequestBuilder<GenerationWorker>()
            .addTag("job_$jobId")
            .build()

        val dlRequest = OneTimeWorkRequestBuilder<DownloadWorker>()
            .addTag("job_$jobId")
            .build()

        workManager.beginUniqueWork(
            "unique_job_$jobId",
            ExistingWorkPolicy.KEEP,
            prepRequest
        )
            .then(genRequest)
            .then(dlRequest)
            .enqueue()
    }

    suspend fun cancelJob(jobId: String) {
        workManager.cancelAllWorkByTag("job_$jobId")
        jobDao.updateJobProgress(jobId, "CANCELLED", "Cancelled by user", 0)
    }

    suspend fun retryJob(jobId: String) {
        val job = jobDao.getJobById(jobId) ?: return
        val resetJob = job.copy(
            status = "QUEUED",
            stage = "idle",
            stageMessage = "Enqueued for retry",
            progress = 0,
            retryCount = 0,
            errorDetails = null,
            eventId = null
        )
        jobDao.updateJob(resetJob)
        scheduleWorkChain(jobId)
    }

    suspend fun pauseQueue() {
        workManager.cancelAllWork()
    }

    suspend fun clearCompleted() {
        jobDao.clearCompletedJobs()
    }
}
