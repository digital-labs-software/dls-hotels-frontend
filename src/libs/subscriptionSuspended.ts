import { SUBSCRIPTION_SUSPENDED_CODE, SUBSCRIPTION_SUSPENDED_EVENT } from '@/types/apps/billingTypes'

export const isSubscriptionSuspendedError = (data: unknown) => {
  return Boolean(data && typeof data === 'object' && (data as { code?: string }).code === SUBSCRIPTION_SUSPENDED_CODE)
}

export const notifySubscriptionSuspended = (data?: unknown) => {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_SUSPENDED_EVENT, { detail: data }))
}

export const raiseIfSubscriptionSuspended = (data: unknown) => {
  if (isSubscriptionSuspendedError(data)) {
    notifySubscriptionSuspended(data)
  }
}

if (typeof window !== 'undefined') {
  const patchedWindow = window as Window & { __dlsFetchPatched?: boolean }

  if (!patchedWindow.__dlsFetchPatched) {
    patchedWindow.__dlsFetchPatched = true

    const originalFetch = window.fetch.bind(window)

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await originalFetch(input, init)

      try {
        const contentType = res.headers.get('content-type') || ''

        if (res.status === 403 && contentType.includes('json')) {
          const data = await res.clone().json()

          raiseIfSubscriptionSuspended(data)
        }
      } catch {
        // ignore non-json 403s
      }

      return res
    }
  }
}
