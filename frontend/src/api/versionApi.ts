import client from './client'
import type { VersionSummary, VersionDetail, SchemaDiff } from '../types/erd'
import type { Project } from '../types/erd'

export async function listVersions(projectId: number): Promise<VersionSummary[]> {
  const res = await client.get(`/projects/${projectId}/versions`)
  return res.data
}

export async function createVersion(projectId: number, message: string): Promise<VersionDetail> {
  const res = await client.post(`/projects/${projectId}/versions`, { message })
  return res.data
}

export async function getVersion(projectId: number, versionId: number): Promise<VersionDetail> {
  const res = await client.get(`/projects/${projectId}/versions/${versionId}`)
  return res.data
}

export async function restoreVersion(projectId: number, versionId: number): Promise<Project> {
  const res = await client.post(`/projects/${projectId}/versions/${versionId}/restore`)
  return res.data
}

export async function generateMigration(fromVersionId: number, toVersionId: number, dialect: string): Promise<{ sql: string; diff: SchemaDiff }> {
  const res = await client.post('/migration/generate', { fromVersionId, toVersionId, dialect })
  return res.data
}
