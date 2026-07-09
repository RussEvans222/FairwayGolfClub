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

  // SF sometimes returns 200 with an XML fault body for expired tokens instead of 401.
  async function checkForSessionError(res: Response): Promise<void> {
    if (res.status === 401) throw new Error('SESSION_EXPIRED')
    if (res.headers.get('content-type')?.includes('xml')) {
      const text = await res.text()
      if (text.includes('InvalidSessionId')) throw new Error('SESSION_EXPIRED')
      throw new Error(`SF XML error: ${text.slice(0, 200)}`)
    }
  }

  const query = useCallback(async <T>(soql: string): Promise<T[]> => {
    if (!auth) throw new Error('Not authenticated')
    const res = await fetch(apiUrl(`/services/data/v67.0/query?q=${encodeURIComponent(soql)}`), {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    })
    await checkForSessionError(res)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      console.error(`[SF] SOQL failed (${res.status}):`, soql, JSON.stringify(err))
      const msg = Array.isArray(err) ? err.map((e: {errorCode?: string; message?: string}) => `${e.errorCode}: ${e.message}`).join(' | ') : `HTTP ${res.status}`
      throw new Error(`[SOQL] ${msg}`)
    }
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
    await checkForSessionError(res)
    if (!res.ok) {
      const err = await res.json()
      console.error(`[SF] Create ${object} failed`, JSON.stringify(err))
      const msg = Array.isArray(err) ? err.map((e: {errorCode?: string; message?: string}) => `${e.errorCode}: ${e.message}`).join(' | ') : JSON.stringify(err)
      throw new Error(`[${object}] ${msg}`)
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
    await checkForSessionError(res)
    if (!res.ok) {
      const err = await res.json()
      console.error(`[SF] Patch ${object}/${id} failed`, JSON.stringify(err))
      const msg = Array.isArray(err) ? err.map((e: {errorCode?: string; message?: string}) => `${e.errorCode}: ${e.message}`).join(' | ') : JSON.stringify(err)
      throw new Error(`[${object}] ${msg}`)
    }
  }, [auth])

  return { auth, refreshAuth, query, create, patch }
}
