package com.hfbatch.studio.data.repository

import android.content.Context
import com.hfbatch.studio.data.crypto.KeystoreManager
import com.hfbatch.studio.data.db.AccountEntity
import com.hfbatch.studio.data.db.AppDatabase
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class AccountRepository(
    context: Context,
    private val database: AppDatabase
) {
    private val accountDao = database.accountDao()
    private val keystoreManager = KeystoreManager(context)

    fun getAllAccounts(): Flow<List<AccountEntity>> = accountDao.getAllAccountsFlow()

    suspend fun addAccount(name: String, token: String, isDefault: Boolean): AccountEntity {
        val alias = "hf_token_${UUID.randomUUID()}"
        keystoreManager.saveToken(alias, token)

        val account = AccountEntity(
            id = "acc_${UUID.randomUUID()}",
            name = name,
            tokenMasked = KeystoreManager.maskToken(token),
            encryptedTokenAlias = alias,
            isDefault = isDefault,
            quotaStatus = "OK",
            quotaResetAt = null,
            lastUsedAt = null,
            createdAt = System.currentTimeMillis()
        )
        accountDao.insertAccount(account)
        return account
    }

    suspend fun getDecryptedToken(account: AccountEntity): String? {
        return keystoreManager.getToken(account.encryptedTokenAlias)
    }

    suspend fun deleteAccount(account: AccountEntity) {
        keystoreManager.removeToken(account.encryptedTokenAlias)
        accountDao.deleteAccount(account)
    }
}
