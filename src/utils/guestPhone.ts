export type GuestPhoneCountry = 'PE' | 'OTHER'

const PERU_EXAMPLE = '987 654 321'

/** 987654321 → 987 654 321 */
export const formatPeruGroups = (digits: string) => digits.replace(/(\d{3})(?=\d)/g, '$1 ')

/**
 * Parte nacional de un celular peruano.
 * Si pegan +51 o 51 delante, se quita. Vacío si no parece un celular del Perú.
 */
export const peruNationalDigits = (raw: string) => {
  const digits = raw.replace(/\D/g, '')

  if (digits.startsWith('0051') && digits.length > 9) return digits.slice(4, 13)
  if (digits.startsWith('51') && digits.length > 9) return digits.slice(2, 11)
  if (digits.startsWith('9')) return digits.slice(0, 9)

  return ''
}

export const parseGuestPhone = (value: string | null | undefined): { country: GuestPhoneCountry; national: string } => {
  const raw = (value ?? '').trim()

  if (!raw) return { country: 'PE', national: '' }

  const national = peruNationalDigits(raw)
  const digits = raw.replace(/\D/g, '')
  const markedPeru = raw.startsWith('+51') || digits.startsWith('0051') || (digits.startsWith('51') && digits.length > 9)
  const localMobile = digits.length <= 9 && digits.startsWith('9')

  if (national && (markedPeru || localMobile)) return { country: 'PE', national }

  return { country: 'OTHER', national: raw }
}

/** Valor guardado: Perú como +51987654321; otro país, el texto tal cual. */
export const storedGuestPhone = (country: GuestPhoneCountry, text: string) => {
  if (country === 'PE') {
    const national = peruNationalDigits(text)

    return national ? `+51${national}` : ''
  }

  return text.slice(0, 20)
}

export const guestPhoneError = (value: string | null | undefined) => {
  const raw = (value ?? '').trim()

  if (!raw) return null
  if (raw.length > 20) return 'Máximo 20 caracteres.'

  const parsed = parseGuestPhone(raw)

  if (parsed.country === 'PE' && !/^9\d{8}$/.test(parsed.national)) {
    return `El celular debe tener 9 dígitos y empezar con 9. Ej. ${PERU_EXAMPLE}.`
  }

  return null
}

/** Cómo se lee un celular ya guardado. Perú: +51 987 654 321. */
export const formatGuestPhone = (value: string | null | undefined) => {
  const raw = (value ?? '').trim()

  if (!raw) return ''

  const parsed = parseGuestPhone(raw)

  if (parsed.country === 'PE' && parsed.national) return `+51 ${formatPeruGroups(parsed.national)}`

  return raw
}
