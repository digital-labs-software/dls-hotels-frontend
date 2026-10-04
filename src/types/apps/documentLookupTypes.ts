export type LookupKind = 'DNI' | 'RUC'

export type LookupReason = 'FOUND' | 'NOT_FOUND' | 'INVALID' | 'UNAVAILABLE' | 'NOT_CONFIGURED'

interface LookupResultBase {
  found: boolean
  reason: LookupReason
  message: string
  documentNumber: string
}

export interface DniLookupResult extends LookupResultBase {
  documentType: 'DNI'
  firstName: string | null
  lastName: string | null
  paternalSurname: string | null
  maternalSurname: string | null
  fullName: string | null

  /** YYYY-MM-DD, el formato que usan los inputs de fecha. */
  birthDate: string | null
}

export interface LookupLocation {
  departmentId: number
  departmentUuid: string
  provinceId: number
  provinceUuid: string
  districtId: number
  districtUuid: string
  districtName: string
}

export interface RucLookupResult extends LookupResultBase {
  documentType: 'RUC'
  businessName: string | null
  tradeName: string | null
  address: string | null
  fullAddress: string | null
  status: string | null
  condition: string | null
  department: string | null
  province: string | null
  district: string | null
  ubigeo: string | null
  location: LookupLocation | null
}

export type LookupResultFor<K extends LookupKind> = K extends 'DNI' ? DniLookupResult : RucLookupResult

export type LookupStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

/** Largo con el que se dispara la consulta automática. */
export const LOOKUP_LENGTH: Record<LookupKind, number> = { DNI: 8, RUC: 11 }
