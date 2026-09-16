import type { NestAuthUser } from '@/types/apps/authTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export async function loginWithPassword(email: string, password: string): Promise<NestAuthUser> {
  const res = await fetch(`${getApiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })

  const data = await res.json()

  if (!res.ok) {
    throw data
  }

  return data
}

export async function loginWithGoogle(idToken: string): Promise<NestAuthUser> {
  const res = await fetch(`${getApiBase()}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  })

  const data = await res.json()

  if (!res.ok) {
    throw data
  }

  return data
}

export async function logoutPassword(accessToken: string) {
  const res = await fetch(`${getApiBase()}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  return res.json().catch(() => ({ message: 'Sesión cerrada' }))
}

export async function logoutGoogle(accessToken: string, googleToken?: string) {
  const res = await fetch(`${getApiBase()}/auth/google/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(googleToken ? { googleToken } : {})
  })

  return res.json().catch(() => ({ message: 'Sesión cerrada' }))
}
