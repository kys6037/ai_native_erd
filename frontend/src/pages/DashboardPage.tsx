import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import useProjectStore from '../stores/projectStore'
import ThemeToggle from '../components/ThemeToggle'
import CreateProjectModal from '../components/CreateProjectModal'

export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { projects, loading, error, fetchProjects, createProject, deleteProject } = useProjectStore()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async (name: string, description: string) => {
    const id = await createProject(name, description)
    navigate(`/project/${id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this project?')) {
      await deleteProject(id)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0d1117]">
      <header className="bg-white dark:bg-[#161b22] border-b border-slate-200 dark:border-[#30363d] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="5" width="16" height="3" rx="1" fill="white" opacity="0.9"/>
              <rect x="2" y="9" width="16" height="3" rx="1" fill="white" opacity="0.7"/>
              <rect x="2" y="13" width="16" height="3" rx="1" fill="white" opacity="0.5"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">ERD Designer</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">{user?.name}</span>
          <ThemeToggle />
          <button
            onClick={logout}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Projects</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Project
          </button>
        </div>

        {loading && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-200 dark:border-[#30363d] rounded-xl">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#21262d] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-slate-400">
                <rect x="2" y="5" width="16" height="3" rx="1" fill="currentColor" opacity="0.5"/>
                <rect x="2" y="9" width="16" height="3" rx="1" fill="currentColor" opacity="0.35"/>
                <rect x="2" y="13" width="16" height="3" rx="1" fill="currentColor" opacity="0.2"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No projects yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-4">Create your first ERD project to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Create project
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="group bg-white dark:bg-[#161b22] rounded-lg border border-slate-200 dark:border-[#30363d] p-4 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">{project.name}</h3>
                  {!project.isOwner && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-medium shrink-0 border border-indigo-100 dark:border-indigo-800/50">
                      Shared
                    </span>
                  )}
                </div>
                {project.isOwner && (
                  <button
                    onClick={(e) => handleDelete(e, project.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 text-xs transition-all shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>
              {project.description && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{project.description}</p>
              )}
              <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-3">
                {new Date(project.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </main>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
