import { describe, it, expect, beforeEach } from 'vitest'
import useThemeStore from '../stores/themeStore'

function resetStore() {
  useThemeStore.setState({ theme: 'light' })
  document.documentElement.classList.remove('dark')
}

describe('themeStore', () => {
  beforeEach(() => {
    resetStore()
  })

  it('starts with light theme', () => {
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('toggleTheme switches light → dark', () => {
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggleTheme switches dark → light', () => {
    useThemeStore.setState({ theme: 'dark' })
    document.documentElement.classList.add('dark')
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme applies dark class to document', () => {
    useThemeStore.getState().setTheme('dark')
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme removes dark class for light theme', () => {
    document.documentElement.classList.add('dark')
    useThemeStore.getState().setTheme('light')
    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
