import client from './client'
import type { DbConnection, ErdData } from '../types/erd'

export async function listConnections(): Promise<DbConnection[]> {
  const res = await client.get('/connections')
  return res.data
}

export async function createConnection(conn: Omit<DbConnection, 'id'>): Promise<DbConnection> {
  const res = await client.post('/connections', conn)
  return res.data
}

export async function deleteConnection(id: number): Promise<void> {
  await client.delete(`/connections/${id}`)
}

export async function testConnection(id: number): Promise<{ success: boolean; message: string }> {
  const res = await client.post(`/connections/${id}/test`)
  return res.data
}

export async function importFromConnection(id: number): Promise<ErdData> {
  const res = await client.post(`/connections/${id}/import`)
  return res.data
}
