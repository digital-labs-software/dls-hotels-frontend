import { getSession } from 'next-auth/react'

import type { LookupKind, LookupResultFor } from '@/types/apps/documentLookupTypes'

const getApiBase = () => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

/**
 * Consulta RENIEC (DNI) o SUNAT (RUC) a través del backend; el token del proveedor nunca llega
 * al navegador. Un documento inexistente no es error: llega found=false con un mensaje.
 */
export const lookupDocument = async <K extends LookupKind>(
  kind: K,
  number: string,
  signal?: AbortSignal
): Promise<LookupResultFor<K>> => {
  const session = await getSession()

  const res = await fetch(`${getApiBase()}/document-lookup/${kind.toLowerCase()}/${encodeURIComponent(number)}`, {
    cache: 'no-store',
    signal,
    headers: session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  return (await res.json()) as LookupResultFor<K>
}
