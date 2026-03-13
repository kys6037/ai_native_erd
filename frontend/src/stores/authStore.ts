import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import client from '../api/client'

interface User {
  id: number
  email: string
  name: string
  createdAt: string
}

interface AuthState {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email, password) => {
        const res = await client.post('/auth/login', { email, password })
        set({ token: res.data.token, user: res.data.user })
      },
      register: async (email, password, name) => {
        const res = await client.post('/auth/register', { email, password, name })
        set({ token: res.data.token, user: res.data.user })
      },
      logout: () => {
        set({ token: null, user: null })
      },
    }),
    { name: 'auth-storage' }
  )
)

export default useAuthStore
