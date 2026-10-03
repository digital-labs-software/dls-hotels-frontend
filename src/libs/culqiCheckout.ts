import type { OnlineCheckout } from '@/types/apps/billingTypes'

type CulqiWindow = Window & {
  Culqi?: {
    publicKey: string
    settings: (options: Record<string, unknown>) => void
    open: () => void
    close?: () => void
    token?: { id?: string; email?: string }
  }
}

const CULQI_SCRIPT = 'https://checkout.culqi.com/js/v4'

export const ensureCulqiScript = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Culqi solo está disponible en el navegador.')
  }

  if ((window as CulqiWindow).Culqi) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CULQI_SCRIPT}"]`)

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Culqi Checkout.')), { once: true })

      return
    }

    const script = document.createElement('script')

    script.src = CULQI_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar Culqi Checkout.'))
    document.body.appendChild(script)
  })
}

/**
 * Opens Culqi Checkout. Confirm the JS API names against Culqi docs when 1.5 ships.
 * Backend contracts (/online/checkout and /online/charge) stay the same.
 */
export const openCulqiCheckout = async (
  checkout: OnlineCheckout,
  onToken: (tokenId: string, email: string) => void
) => {
  await ensureCulqiScript()

  const culqi = (window as CulqiWindow).Culqi

  if (!culqi) {
    throw new Error('Culqi Checkout no está disponible.')
  }

  culqi.publicKey = checkout.publicKey
  culqi.settings({
    title: checkout.description,
    currency: checkout.currency,
    amount: checkout.amountInCents,
    order: checkout.orderId || undefined
  })

  ;(window as Window & { culqi?: () => void }).culqi = () => {
    const tokenId = culqi.token?.id
    const email = culqi.token?.email || checkout.email || ''

    if (tokenId) {
      onToken(tokenId, email)
    }
  }

  culqi.open()
}
