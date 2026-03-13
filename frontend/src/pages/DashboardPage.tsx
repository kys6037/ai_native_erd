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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">ERD Designer</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">{user?.name}</span>
          <ThemeToggle />
          <button onClick={logout} className="text-sm text-red-600 hover:underline">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projects</h2>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + New Project
          </button>
        </div>

        {loading && (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        )}
        {error && (
          <p className="text-red-600">{error}</p>
        )}

        {!loading && projects.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No projects yet</p>
            <p className="text-sm mt-1">Create your first ERD project to get started</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{project.name}</h3>
                <button
                  onClick={(e) => handleDelete(e, project.id)}
                  className="text-gray-400 hover:text-red-500 text-xs ml-2 shrink-0"
                >
                  Delete
                </button>
              </div>
              {project.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {new Date(project.updatedAt).toLocaleDateString()}
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
