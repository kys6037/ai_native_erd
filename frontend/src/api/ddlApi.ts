import client from './client'
import type { ErdData } from '../types/erd'

export async function generateDdl(erdData: ErdData, dialect: string): Promise<string> {
  const res = await client.post('/ddl/generate', { erdData, dialect })
  return res.data.sql
}

export async function parseDdl(sql: string, dialect: string): Promise<{ erdData: ErdData; warnings: string[] }> {
  const res = await client.post('/ddl/parse', { sql, dialect })
  return res.data
}
