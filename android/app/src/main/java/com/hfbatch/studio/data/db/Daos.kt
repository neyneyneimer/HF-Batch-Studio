package com.hfbatch.studio.data.db

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface SpaceDao {
    @Query("SELECT * FROM spaces ORDER BY isBuiltin DESC, name ASC")
    fun getAllSpacesFlow(): Flow<List<SpaceEntity>>

    @Query("SELECT * FROM spaces WHERE id = :id")
    suspend fun getSpaceById(id: String): SpaceEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSpace(space: SpaceEntity)

    @Delete
    suspend fun deleteSpace(space: SpaceEntity)
}

@Dao
interface JobProfileDao {
    @Query("SELECT * FROM job_profiles ORDER BY name ASC")
    fun getAllProfilesFlow(): Flow<List<JobProfileEntity>>

    @Query("SELECT * FROM job_profiles WHERE id = :id")
    suspend fun getProfileById(id: String): JobProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProfile(profile: JobProfileEntity)

    @Delete
    suspend fun deleteProfile(profile: JobProfileEntity)
}

@Dao
interface BatchJobDao {
    @Query("SELECT * FROM batch_jobs ORDER BY createdAt ASC")
    fun getAllJobsFlow(): Flow<List<BatchJobEntity>>

    @Query("SELECT * FROM batch_jobs WHERE status = 'QUEUED' ORDER BY createdAt ASC LIMIT 1")
    suspend fun getNextQueuedJob(): BatchJobEntity?

    @Query("SELECT * FROM batch_jobs WHERE id = :id")
    suspend fun getJobById(id: String): BatchJobEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertJobs(jobs: List<BatchJobEntity>)

    @Update
    suspend fun updateJob(job: BatchJobEntity)

    @Query("UPDATE batch_jobs SET status = :status, stageMessage = :message, progress = :progress WHERE id = :jobId")
    suspend fun updateJobProgress(jobId: String, status: String, message: String, progress: Int)

    @Delete
    suspend fun deleteJob(job: BatchJobEntity)

    @Query("DELETE FROM batch_jobs WHERE status IN ('COMPLETED', 'CANCELLED')")
    suspend fun clearCompletedJobs()
}

@Dao
interface BatchResultDao {
    @Query("SELECT * FROM batch_results ORDER BY createdAt DESC")
    fun getAllResultsFlow(): Flow<List<BatchResultEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertResult(result: BatchResultEntity)

    @Delete
    suspend fun deleteResult(result: BatchResultEntity)
}

@Dao
interface AccountDao {
    @Query("SELECT * FROM hf_accounts ORDER BY isDefault DESC, createdAt ASC")
    fun getAllAccountsFlow(): Flow<List<AccountEntity>>

    @Query("SELECT * FROM hf_accounts WHERE id = :id")
    suspend fun getAccountById(id: String): AccountEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAccount(account: AccountEntity)

    @Delete
    suspend fun deleteAccount(account: AccountEntity)
}
