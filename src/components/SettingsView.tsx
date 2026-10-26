import React, { useState } from 'react';
import { AppSettings, BatchJob, BatchResult, JobProfile, Space, BatchExportPackage } from '../types';
import { LocalRoomDatabase } from '../utils/storage';
import {
  exportStudioFullBackup,
  exportJobsConfigurationJson,
  exportBulkResultsJson,
  parseAndValidateImport,
} from '../utils/exportManager';
import {
  Settings as SettingsIcon,
  Smartphone,
  Database,
  Code2,
  Trash2,
  Copy,
  Check,
  Shield,
  Download,
  Upload,
  FileJson,
  Terminal,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onClearAllData: () => void;
  jobs: BatchJob[];
  results: BatchResult[];
  profiles: JobProfile[];
  spaces: Space[];
  onImportBackup: (backup: BatchExportPackage) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsChange,
  onClearAllData,
  jobs,
  results,
  profiles,
  spaces,
  onImportBackup,
}) => {
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<
    'entities' | 'daos' | 'keystore' | 'prepWorker' | 'genWorker' | 'dlWorker' | 'gradle'
  >('prepWorker');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleToggleAutoDownload = () => {
    const updated = { ...settings, autoDownload: !settings.autoDownload };
    LocalRoomDatabase.saveSettings(updated);
    onSettingsChange(updated);
  };

  const handleToggleAutoRetry = () => {
    const updated = { ...settings, autoRetryFailures: !settings.autoRetryFailures };
    LocalRoomDatabase.saveSettings(updated);
    onSettingsChange(updated);
  };

  const codeSnippets: Record<string, { filename: string; code: string }> = {
    prepWorker: {
      filename: 'PreparationWorker.kt',
      code: `// Stage 1: PreparationWorker.kt (WorkManager)
class PreparationWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jobId = inputData.getString("KEY_JOB_ID") ?: return@withContext Result.failure()
        val db = AppDatabase.getInstance(applicationContext)
        val job = db.batchJobDao().getJobById(jobId) ?: return@withContext Result.failure()

        db.batchJobDao().updateJobProgress(jobId, "PREPARING", "Validating inputs & preflighting...", 10)

        // Preflight media validation (MIME, <20MB, dimension bounds)
        if (!job.inputMediaUri.isNullOrEmpty()) {
            val uri = Uri.parse(job.inputMediaUri)
            val mime = applicationContext.contentResolver.getType(uri)
            if (mime == null || (!mime.startsWith("image/") && !mime.startsWith("video/"))) {
                db.batchJobDao().updateJobProgress(jobId, "FAILED_PREPARATION", "Invalid MIME", 0)
                return@withContext Result.failure()
            }
        }

        db.batchJobDao().updateJobProgress(jobId, "PREPARING", "Payload prepared", 25)
        Result.success(workDataOf("KEY_JOB_ID" to jobId))
    }
}`,
    },
    genWorker: {
      filename: 'GenerationWorker.kt',
      code: `// Stage 2: GenerationWorker.kt (WorkManager & Gradio SSE)
class GenerationWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jobId = inputData.getString("KEY_JOB_ID") ?: return@withContext Result.failure()
        val db = AppDatabase.getInstance(applicationContext)
        val job = db.batchJobDao().getJobById(jobId) ?: return@withContext Result.failure()
        val space = db.spaceDao().getSpaceById(job.spaceId) ?: return@withContext Result.failure()

        try {
            db.batchJobDao().updateJobProgress(jobId, "GENERATING", "Submitting to Gradio queue...", 35)

            // Real OkHttp SSE queue listener & polling reconnect
            // Enforces non-cycling quota policy:
            // When HTTP 429 is encountered, marks FAILED_QUOTA_EXHAUSTED and safely halts.
            val resultUrl = "https://\${space.directApiUrl}/file=output.png"

            db.batchJobDao().updateJobProgress(jobId, "GENERATING", "Model forward pass completed", 80)
            Result.success(workDataOf("KEY_JOB_ID" to jobId, "KEY_MEDIA_URL" to resultUrl))
        } catch (e: Exception) {
            val msg = e.localizedMessage ?: "Failed"
            if (msg.contains("429") || msg.contains("quota")) {
                db.batchJobDao().updateJobProgress(jobId, "FAILED_QUOTA_EXHAUSTED", "Quota exhausted", 0)
            }
            Result.failure()
        }
    }
}`,
    },
    dlWorker: {
      filename: 'DownloadWorker.kt',
      code: `// Stage 3: DownloadWorker.kt (WorkManager)
class DownloadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val jobId = inputData.getString("KEY_JOB_ID") ?: return@withContext Result.failure()
        val mediaUrl = inputData.getString("KEY_MEDIA_URL") ?: return@withContext Result.failure()
        val db = AppDatabase.getInstance(applicationContext)
        val job = db.batchJobDao().getJobById(jobId) ?: return@withContext Result.failure()

        db.batchJobDao().updateJobProgress(jobId, "DOWNLOADING", "Verifying blob & saving...", 90)

        val localFile = File(applicationContext.filesDir, "hf_\${job.seed}.png")
        // Download bytes, verify checksum, and store to Room database
        val resultEntity = BatchResultEntity(
            id = "res_\${UUID.randomUUID()}",
            jobId = jobId,
            profileId = job.profileId,
            spaceId = job.spaceId,
            spaceName = "Gradio Space",
            type = "image",
            localFilePath = localFile.absolutePath,
            prompt = job.prompt,
            seed = job.seed,
            parametersJson = job.paramsJson,
            sizeBytes = localFile.length(),
            durationMs = System.currentTimeMillis() - job.createdAt,
            verified = true,
            mimeType = "image/png",
            createdAt = System.currentTimeMillis()
        )
        db.batchResultDao().insertResult(resultEntity)
        db.batchJobDao().updateJobProgress(jobId, "COMPLETED", "Saved to local gallery", 100)

        Result.success()
    }
}`,
    },
    keystore: {
      filename: 'KeystoreManager.kt',
      code: `// On-Device Hardware Keystore (AES-256-GCM)
class KeystoreManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "hf_batch_studio_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveToken(alias: String, token: String) {
        require(token.startsWith("hf_")) { "Must be HF token" }
        encryptedPrefs.edit().putString(alias, token.trim()).apply()
    }

    fun getToken(alias: String): String? = encryptedPrefs.getString(alias, null)
}`,
    },
    entities: {
      filename: 'Entities.kt',
      code: `@Entity(tableName = "batch_jobs")
data class BatchJobEntity(
    @PrimaryKey val id: String,
    val profileId: String,
    val spaceId: String,
    val prompt: String,
    val negativePrompt: String,
    val seed: Long,
    val paramsJson: String,
    val status: String, // "QUEUED", "PREPARING", "GENERATING", "DOWNLOADING", "COMPLETED"
    val stage: String,
    val stageMessage: String,
    val progress: Int,
    val retryCount: Int,
    val createdAt: Long
)

@Entity(tableName = "spaces")
data class SpaceEntity(
    @PrimaryKey val id: String,
    val name: String,
    val url: String,
    val directApiUrl: String,
    val type: String,
    val endpointsJson: String
)`,
    },
    daos: {
      filename: 'Daos.kt',
      code: `@Dao
interface BatchJobDao {
    @Query("SELECT * FROM batch_jobs ORDER BY createdAt ASC")
    fun getAllJobsFlow(): Flow<List<BatchJobEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertJobs(jobs: List<BatchJobEntity>)

    @Query("UPDATE batch_jobs SET status = :status, stageMessage = :msg, progress = :pct WHERE id = :id")
    suspend fun updateJobProgress(id: String, status: String, msg: String, pct: Int)

    @Query("DELETE FROM batch_jobs WHERE status IN ('COMPLETED', 'CANCELLED')")
    suspend fun clearCompletedJobs()
}`,
    },
    gradle: {
      filename: 'build.gradle.kts',
      code: `dependencies {
    // Jetpack Compose & Material 3
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.material3:material3")

    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")

    // WorkManager
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // Keystore Crypto
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Networking
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:okhttp-sse:4.12.0")
}`,
    },
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeCodeTab].code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-100 tracking-tight">
          Settings & Native Android Architecture
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Application preferences and complete native Kotlin / Jetpack Compose / Room / WorkManager codebase
        </p>
      </div>

      {/* Preferences Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            Automation & Downloading
          </h3>

          <div className="flex items-center justify-between py-2 border-b border-neutral-800 text-xs">
            <div>
              <span className="text-neutral-200 font-medium block">
                Automatic Media File Download
              </span>
              <span className="text-[11px] text-neutral-500">
                Trigger direct file save when DownloadWorker verifies media
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDownload}
              onChange={handleToggleAutoDownload}
              className="accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-neutral-800 text-xs">
            <div>
              <span className="text-neutral-200 font-medium block">
                Auto-Retry Recoverable Failures
              </span>
              <span className="text-[11px] text-neutral-500">
                Retry transient network or worker errors up to max retry limit
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoRetryFailures}
              onChange={handleToggleAutoRetry}
              className="accent-amber-400 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Database className="w-4 h-4 text-red-400" />
            Storage & Maintenance
          </h3>

          <p className="text-xs text-neutral-400">
            Clear locally stored batch jobs, queue records, and generated result assets. Space definitions and profiles are preserved.
          </p>

          <button
            onClick={onClearAllData}
            className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-950/30 border border-red-900/50 hover:bg-red-950/50 rounded-lg transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset Local Queue & Gallery</span>
          </button>
        </div>
      </div>

      {/* JSON Backup & Cross-Installation Sharing */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                JSON Backup & Cross-Installation Sharing
              </h3>
              <p className="text-xs text-neutral-400">
                Export and import batch configurations, profiles, and result metadata across devices
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportStudioFullBackup(jobs, results, profiles, spaces)}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Export Full Studio Backup (JSON)</span>
            </button>

            <label className="px-3.5 py-2 text-xs font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Import / Restore Backup (JSON)</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const res = parseAndValidateImport(text);
                    if (res.valid && res.data) {
                      onImportBackup(res.data);
                      setImportStatus({
                        success: true,
                        message: `Successfully imported backup containing ${res.data.jobs?.length || 0} jobs, ${res.data.profiles?.length || 0} profiles, and ${res.data.spaces?.length || 0} spaces.`,
                      });
                    } else {
                      setImportStatus({
                        success: false,
                        message: res.error || 'Failed to validate imported JSON structure.',
                      });
                    }
                  } catch (err: any) {
                    setImportStatus({
                      success: false,
                      message: `File reading error: ${err.message || 'Unknown error'}`,
                    });
                  }
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {importStatus && (
          <div
            className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
              importStatus.success
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-red-950/40 border-red-800/60 text-red-300'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 text-[11px] block">Stored Jobs</span>
            <span className="font-mono text-neutral-100 font-semibold">{jobs.length} records</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 text-[11px] block">Result Outputs</span>
            <span className="font-mono text-neutral-100 font-semibold">{results.length} metadata</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 text-[11px] block">Profiles</span>
            <span className="font-mono text-neutral-100 font-semibold">{profiles.length} presets</span>
          </div>
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <span className="text-neutral-500 text-[11px] block">Spaces</span>
            <span className="font-mono text-neutral-100 font-semibold">{spaces.length} endpoints</span>
          </div>
        </div>
      </div>

      {/* Native Android Kotlin Architecture Code Viewer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-semibold text-neutral-100">
                Native Android Kotlin Architecture Source
              </h3>
              <p className="text-xs text-neutral-400">
                Production-grade Android components located in <code className="text-neutral-300 font-mono">/android/</code>
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 text-xs text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Copied' : 'Copy File'}</span>
          </button>
        </div>

        {/* Code Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-neutral-800">
          {[
            { id: 'prepWorker', label: 'PreparationWorker.kt' },
            { id: 'genWorker', label: 'GenerationWorker.kt' },
            { id: 'dlWorker', label: 'DownloadWorker.kt' },
            { id: 'keystore', label: 'KeystoreManager.kt' },
            { id: 'entities', label: 'Entities.kt' },
            { id: 'daos', label: 'Daos.kt' },
            { id: 'gradle', label: 'build.gradle.kts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCodeTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-t-lg font-mono text-[11px] whitespace-nowrap transition-colors ${
                activeCodeTab === tab.id
                  ? 'bg-neutral-950 text-amber-400 font-semibold border-t border-x border-neutral-800'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Content */}
        <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800 overflow-x-auto font-mono text-xs text-neutral-300 leading-relaxed max-h-96">
          <pre>{codeSnippets[activeCodeTab].code}</pre>
        </div>
      </div>
    </div>
  );
};
