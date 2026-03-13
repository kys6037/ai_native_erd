import client from './client'
import type { DictionaryEntry } from '../types/erd'

export async function listDictionary(projectId: number, tableName?: string): Promise<DictionaryEntry[]> {
  const res = await client.get(`/projects/${projectId}/dictionary`, { params: tableName ? { tableName } : {} })
  return res.data
}

export async function upsertDictionary(projectId: number, entry: Omit<DictionaryEntry, 'id' | 'updatedAt'>): Promise<DictionaryEntry> {
  const res = await client.post(`/projects/${projectId}/dictionary`, entry)
  return res.data
}

export async function deleteDictionaryEntry(projectId: number, entryId: number): Promise<void> {
  await client.delete(`/projects/${projectId}/dictionary/${entryId}`)
}
