package com.hfbatch.studio.data.repository

import com.hfbatch.studio.data.db.AppDatabase
import com.hfbatch.studio.data.db.SpaceEntity
import kotlinx.coroutines.flow.Flow

class SpaceRepository(private val database: AppDatabase) {
    private val spaceDao = database.spaceDao()

    fun getAllSpaces(): Flow<List<SpaceEntity>> = spaceDao.getAllSpacesFlow()

    suspend fun getSpaceById(id: String): SpaceEntity? = spaceDao.getSpaceById(id)

    suspend fun saveSpace(space: SpaceEntity) {
        spaceDao.insertSpace(space)
    }

    suspend fun deleteSpace(space: SpaceEntity) {
        spaceDao.deleteSpace(space)
    }
}
