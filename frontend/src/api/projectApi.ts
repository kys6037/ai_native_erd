import client from './client'
import type { Project, ProjectSummary, ErdData } from '../types/erd'

export async function listProjects(): Promise<ProjectSummary[]> {
  const res = await client.get('/projects')
  return res.data
}

export async function createProject(name: string, description: string): Promise<Project> {
  const res = await client.post('/projects', { name, description })
  return res.data
}

export async function getProject(id: number): Promise<Project> {
  const res = await client.get(`/projects/${id}`)
  return res.data
}

export async function updateProject(id: number, name: string, description: string, erdData: ErdData): Promise<Project> {
  const res = await client.put(`/projects/${id}`, { name, description, erdData })
  return res.data
}

export async function deleteProject(id: number): Promise<void> {
  await client.delete(`/projects/${id}`)
}
