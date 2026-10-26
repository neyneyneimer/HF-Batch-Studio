package com.hfbatch.studio

import android.app.Application
import androidx.work.Configuration

class HFBatchStudioApplication : Application(), Configuration.Provider {
    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()
}
