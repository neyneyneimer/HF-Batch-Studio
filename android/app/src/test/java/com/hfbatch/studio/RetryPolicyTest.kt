package com.hfbatch.studio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RetryPolicyTest {

    @Test
    fun testExponentialBackoffCalculation() {
        fun calculateBackoff(attempt: Int, baseDelayMs: Long = 1000L, maxDelayMs: Long = 15000L): Long {
            val delay = baseDelayMs * (1L shl attempt)
            return minOf(delay, maxDelayMs)
        }

        assertEquals(2000L, calculateBackoff(1))
        assertEquals(4000L, calculateBackoff(2))
        assertEquals(8000L, calculateBackoff(3))
        assertEquals(15000L, calculateBackoff(4)) // capped at maxDelayMs
    }

    @Test
    fun testNonRetryableErrorsNeverRetry() {
        fun isRetryable(errorCode: String): Boolean {
            return when (errorCode) {
                "FAILED_QUOTA_EXHAUSTED" -> false // Never retry or cycle accounts to evade quota
                "FAILED_AUTH" -> false            // Invalid credentials require user intervention
                "FAILED_PREPARATION" -> false     // Bad input or invalid MIME cannot succeed on retry
                "FAILED_SERVER_ERROR" -> true     // Transient GPU/CUDA out of memory can be retried
                "FAILED_TIMEOUT" -> true          // Network glitch can be retried with backoff
                else -> false
            }
        }

        assertFalse(isRetryable("FAILED_QUOTA_EXHAUSTED"))
        assertFalse(isRetryable("FAILED_AUTH"))
        assertFalse(isRetryable("FAILED_PREPARATION"))
        assertTrue(isRetryable("FAILED_SERVER_ERROR"))
        assertTrue(isRetryable("FAILED_TIMEOUT"))
    }
}
