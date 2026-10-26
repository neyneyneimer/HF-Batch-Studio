package com.hfbatch.studio.data.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "spaces")
data class SpaceEntity(
    @PrimaryKey val id: String,
    val name: String,
    val url: String,
    val directApiUrl: String,
    val type: String, // "image" or "video"
    val status: String, // "DISCOVERED", "MANUAL", "VERIFYING", "ERROR"
    val apiProtocol: String, // "v4_stream" or "v3_json"
    val selectedEndpoint: String,
    val parametersJson: String,
    val description: String,
    val lastDiscoveredAt: Long,
    val isBuiltin: Boolean = false
)

@Entity(tableName = "job_profiles")
data class JobProfileEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String,
    val spaceId: String,
    val endpoint: String,
    val promptTemplate: String,
    val negativePrompt: String,
    val width: Int,
    val height: Int,
    val numInferenceSteps: Int,
    val guidanceScale: Float,
    val numFrames: Int? = null,
    val fps: Int? = null,
    val motionBucket: Int? = null,
    val seedStrategy: String, // "fixed", "sequential", "random"
    val baseSeed: Long,
    val timeoutSeconds: Int,
    val maxRetries: Int,
    val preflightEnabled: Boolean,
    val accountId: String? = null
)

@Entity(tableName = "batch_jobs")
data class BatchJobEntity(
    @PrimaryKey val id: String,
    val profileId: String,
    val spaceId: String,
    val prompt: String,
    val negativePrompt: String,
    val seed: Long,
    val paramsJson: String,
    val inputMediaUri: String? = null,
    val status: String, // "QUEUED", "PREPARING", "GENERATING", "DOWNLOADING", "COMPLETED", "FAILED_...", "CANCELLED", "PAUSED"
    val stage: String, // "idle", "prep", "gen", "dl"
    val stageMessage: String,
    val progress: Int,
    val etaSeconds: Int? = null,
    val queuePosition: Int? = null,
    val eventId: String? = null,
    val sessionHash: String? = null,
    val retryCount: Int = 0,
    val maxRetries: Int = 2,
    val errorDetails: String? = null,
    val createdAt: Long,
    val startedAt: Long? = null,
    val completedAt: Long? = null,
    val resultId: String? = null
)

@Entity(tableName = "batch_results")
data class BatchResultEntity(
    @PrimaryKey val id: String,
    val jobId: String,
    val profileId: String,
    val spaceId: String,
    val spaceName: String,
    val type: String, // "image" or "video"
    val localFilePath: String,
    val thumbnailFilePath: String? = null,
    val prompt: String,
    val seed: Long,
    val parametersJson: String,
    val sizeBytes: Long,
    val durationMs: Long,
    val verified: Boolean,
    val mimeType: String,
    val createdAt: Long
)

@Entity(tableName = "hf_accounts")
data class AccountEntity(
    @PrimaryKey val id: String,
    val name: String,
    val tokenMasked: String,
    val encryptedTokenAlias: String, // Key in Android Keystore / EncryptedSharedPreferences
    val isDefault: Boolean,
    val quotaStatus: String, // "OK", "EXHAUSTED", "RATE_LIMITED", "UNKNOWN"
    val quotaResetAt: Long? = null,
    val lastUsedAt: Long? = null,
    val createdAt: Long
)
