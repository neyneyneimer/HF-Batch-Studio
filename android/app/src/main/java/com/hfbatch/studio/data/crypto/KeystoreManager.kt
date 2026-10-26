package com.hfbatch.studio.data.crypto

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Hardware-backed credential management using Android Keystore.
 * Stored via EncryptedSharedPreferences with AES256-GCM and MasterKey.
 * Prohibits token logging, plaintext exposure, or transmission to third-party services.
 */
class KeystoreManager(context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val encryptedPrefs: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "hf_batch_studio_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun saveToken(alias: String, token: String) {
        require(token.startsWith("hf_")) { "Invalid Hugging Face token format" }
        encryptedPrefs.edit().putString(alias, token.trim()).apply()
    }

    fun getToken(alias: String): String? {
        return encryptedPrefs.getString(alias, null)
    }

    fun removeToken(alias: String) {
        encryptedPrefs.edit().remove(alias).apply()
    }

    companion object {
        fun maskToken(token: String): String {
            val clean = token.trim()
            if (clean.length <= 8) return "••••••••"
            val prefix = if (clean.startsWith("hf_")) "hf_" else clean.take(3)
            val suffix = clean.takeLast(4)
            return "$prefix••••••••$suffix"
        }
    }
}
