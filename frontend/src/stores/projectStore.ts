import { create } from 'zustand'
import type { ProjectSummary } from '../types/erd'
import { listProjects, createProject as apiCreateProject, deleteProject as apiDeleteProject } from '../api/projectApi'

interface ProjectState {
  projects: ProjectSummary[]
  loading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  createProject: (name: string, description: string) => Promise<number>
  deleteProject: (id: number) => Promise<void>
}

const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await listProjects()
      set({ projects, loading: false })
    } catch {
      set({ loading: false, error: 'Failed to load projects' })
    }
  },

  createProject: async (name, description) => {
    const project = await apiCreateProject(name, description)
    await get().fetchProjects()
    return project.id
  },

  deleteProject: async (id) => {
    await apiDeleteProject(id)
    set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
  },
}))

export default useProjectStore
