import { useState } from 'react'
import { generateInviteLink } from '../api/projectApi'

interface Props {
  projectId: number
  onClose: () => void
}

export default function InviteModal({ projectId, onClose }: Props) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const data = await generateInviteLink(projectId)
      setInviteUrl(data.inviteUrl)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프로젝트 초대</h2>

        {!inviteUrl ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              초대 링크를 생성하면 링크를 받은 사람이 이 프로젝트에 참여할 수 있습니다.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:underline">
                취소
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
              >
                {loading ? '생성 중...' : '초대 링크 생성'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              아래 링크를 공유하세요. 로그인한 사용자라면 누구든 참여할 수 있습니다.
            </p>
            <div className="flex gap-2 mb-6">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
              >
                {copied ? '복사됨!' : '복사'}
              </button>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
