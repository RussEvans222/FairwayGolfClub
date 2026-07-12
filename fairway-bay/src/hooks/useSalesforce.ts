import { useState, useCallback } from 'react'

const STORAGE_KEY = 'fg_bay_auth'
const ENV_INSTANCE = import.meta.env.VITE_SF_INSTANCE_URL as string | undefined
const ENV_TOKEN = import.meta.env.VITE_SF_ACCESS_TOKEN as string | undefined

export interface SfAuth {
  instanceUrl: string
  accessToken: string
}

function loadAuth(): SfAuth | null {
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

  function apiUrl(path: string) {
    return `/sfapi${path}`
  }

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
      const msg = Array.isArray(err)
        ? err.map((e: { errorCode?: string; message?: string }) => `${e.errorCode}: ${e.message}`).join(' | ')
        : `HTTP ${res.status}`
      throw new Error(`[SOQL] ${msg}`)
    }
    const data = await res.json()
    return data.records as T[]
  }, [auth])

  const create = useCallback(async <T>(object: string, body: Record<string, unknown>): Promise<T> => {
    if (!auth) throw new Error('Not authenticated')
    const res = await fetch(apiUrl(`/services/data/v67.0/sobjects/${object}`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    await checkForSessionError(res)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      const msg = Array.isArray(err)
        ? err.map((e: { errorCode?: string; message?: string }) => `${e.errorCode}: ${e.message}`).join(' | ')
        : `HTTP ${res.status}`
      throw new Error(`[${object}] ${msg}`)
    }
    return res.json() as Promise<T>
  }, [auth])

  // Calls a custom Apex REST endpoint (POST) — used for the smart-extend
  // flow, which needs bay-conflict logic that's not safe to reimplement
  // client-side (see FairwaySessionExtendApi.cls).
  const postApexRest = useCallback(async <T>(path: string, body: unknown): Promise<T> => {
    if (!auth) throw new Error('Not authenticated')
    const res = await fetch(apiUrl(`/services/apexrest${path}`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    await checkForSessionError(res)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      const msg = Array.isArray(err)
        ? err.map((e: { errorCode?: string; message?: string }) => `${e.errorCode}: ${e.message}`).join(' | ')
        : `HTTP ${res.status}`
      throw new Error(`[ApexRest] ${msg}`)
    }
    return (await res.json()) as T
  }, [auth])

  return { auth, refreshAuth, query, create, postApexRest }
}
