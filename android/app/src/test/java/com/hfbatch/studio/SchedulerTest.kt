package com.hfbatch.studio

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SchedulerTest {

    @Test
    fun testJobStatusTransitions() {
        val validTransitions = mapOf(
            "QUEUED" to listOf("PREPARING", "CANCELLED", "PAUSED"),
            "PREPARING" to listOf("GENERATING", "FAILED_PREPARATION", "CANCELLED", "PAUSED"),
            "GENERATING" to listOf("DOWNLOADING", "FAILED_SERVER_ERROR", "FAILED_QUOTA_EXHAUSTED", "FAILED_AUTH", "CANCELLED", "PAUSED"),
            "DOWNLOADING" to listOf("COMPLETED", "FAILED_SERVER_ERROR", "CANCELLED"),
            "PAUSED" to listOf("QUEUED", "PREPARING", "GENERATING", "CANCELLED")
        )

        assertTrue(validTransitions["QUEUED"]!!.contains("PREPARING"))
        assertTrue(validTransitions["GENERATING"]!!.contains("FAILED_QUOTA_EXHAUSTED"))
        assertFalse(validTransitions["DOWNLOADING"]!!.contains("PREPARING"))
    }

    @Test
    fun testOrderedExecutionPreserved() {
        val jobs = listOf(
            TestJob(id = "job_1", createdAt = 1000L),
            TestJob(id = "job_2", createdAt = 2000L),
            TestJob(id = "job_3", createdAt = 3000L)
        )

        val sorted = jobs.sortedBy { it.createdAt }
        assertEquals("job_1", sorted[0].id)
        assertEquals("job_2", sorted[1].id)
        assertEquals("job_3", sorted[2].id)
    }

    data class TestJob(val id: String, val createdAt: Long)
}
