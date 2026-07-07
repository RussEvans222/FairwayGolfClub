import { useState, useCallback } from 'react'

const STORAGE_KEY = 'fg_sf_auth'
const ENV_INSTANCE = import.meta.env.VITE_SF_INSTANCE_URL as string | undefined
const ENV_TOKEN = import.meta.env.VITE_SF_ACCESS_TOKEN as string | undefined

export interface SfAuth {
  instanceUrl: string
  accessToken: string
}

function loadAuth(): SfAuth | null {
  // Prefer localStorage (set via OAuth login), fall back to env vars
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as SfAuth
  } catch { /* ignore */ }
  if (ENV_INSTANCE && ENV_TOKEN) return { instanceUrl: ENV_INSTANCE, accessToken: ENV_TOKEN }
  return null
}

export function saveAuth(auth: SfAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY)
}

export function useSalesforce() {
  const [auth, setAuth] = useState<SfAuth | null>(loadAuth)

  const refreshAuth = useCallback(() => {
    setAuth(loadAuth())
  }, [])

  // Route through /sfapi/ proxy (same-origin) to avoid CORS.
  // In dev: Vite proxies /sfapi/* → Salesforce instance.
  // In prod: Cloudflare Pages Function at /functions/sfapi/[[path]].ts does the same.
  function apiUrl(path: string) {
    return `/sfapi${path}`
  }

  const query = useCallback(async <T>(soql: string): Promise<T[]> => {
    if (!auth) throw new Error('Not authenticated')
    const res = await fetch(apiUrl(`/services/data/v67.0/query?q=${encodeURIComponent(soql)}`), {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
    if (res.status === 401) throw new Error('SESSION_EXPIRED')
    if (!res.ok) throw new Error(`SOQL failed: ${res.status}`)
    const data = await res.json()
    return data.records as T[]
  }, [auth])

  const create = useCallback(async <T>(object: string, body: Record<string, unknown>): Promise<T> => {
    if (!auth) throw new Error('Not authenticated')
    const res = await fetch(apiUrl(`/services/data/v67.0/sobjects/${object}`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 401) throw new Error('SESSION_EXPIRED')
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err[0]?.message || `Create ${object} failed: ${res.status}`)
    }
    return res.json() as Promise<T>
  }, [auth])

  const patch = useCallback(async (object: string, id: string, body: Record<string, unknown>): Promise<void> => {
    if (!auth) throw new Error('Not authenticated')
    const res = await fetch(apiUrl(`/services/data/v67.0/sobjects/${object}/${id}`), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 401) throw new Error('SESSION_EXPIRED')
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err[0]?.message || `Patch ${object} failed: ${res.status}`)
    }
  }, [auth])

  return { auth, refreshAuth, query, create, patch }
}
