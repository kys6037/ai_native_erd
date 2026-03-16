import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { joinProject } from '../api/projectApi'
import useAuthStore from '../stores/authStore'

export default function JoinPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const authToken = useAuthStore((s) => s.token)
  const [status, setStatus] = useState<'joining' | 'success' | 'error'>('joining')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!authToken) {
      navigate(`/login?redirect=/join/${token}`)
      return
    }
    if (!token) return

    joinProject(token)
      .then((data) => {
        setStatus('success')
        setMessage(data.name)
        setTimeout(() => navigate(`/project/${data.projectId}`), 1500)
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.response?.data?.error ?? '유효하지 않은 초대 링크입니다.')
      })
  }, [token, authToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        {status === 'joining' && (
          <>
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-600 dark:text-gray-400">프로젝트에 참여 중...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <p className="text-4xl mb-4">✅</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">"{message}" 프로젝트에 참여했습니다!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">잠시 후 이동합니다...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-4xl mb-4">⚠️</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              대시보드로 이동
            </button>
          </>
        )}
      </div>
    </div>
  )
}
