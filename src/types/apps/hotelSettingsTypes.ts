export type PropertyCategory =
  | 'HOTEL'
  | 'HOSTAL'
  | 'HOSPEDAJE'
  | 'ALBERGUE'
  | 'RESORT'
  | 'LODGE'
  | 'APART_HOTEL'
  | 'CASA_HUESPEDES'
  | 'BUNGALOW'

export const PROPERTY_CATEGORIES = [
  'HOTEL',
  'HOSTAL',
  'HOSPEDAJE',
  'ALBERGUE',
  'RESORT',
  'LODGE',
  'APART_HOTEL',
  'CASA_HUESPEDES',
  'BUNGALOW'
] as const

export const PROPERTY_CATEGORY_LABELS: Record<PropertyCategory, string> = {
  HOTEL: 'Hotel',
  HOSTAL: 'Hostal',
  HOSPEDAJE: 'Hospedaje',
  ALBERGUE: 'Albergue',
  RESORT: 'Resort',
  LODGE: 'Lodge',
  APART_HOTEL: 'Apart hotel',
  CASA_HUESPEDES: 'Casa de huéspedes',
  BUNGALOW: 'Bungalow'
}

export interface PropertyLocation {
  departmentId: number
  departmentName: string
  provinceId: number
  provinceName: string
  districtId: number
  districtName: string
}

export interface PropertySettings {
  id: number
  uuid: string
  districtId: number
  name: string
  domain: string
  category: PropertyCategory
  taxNumber: string | null
  businessName: string | null
  tradeName: string | null
  description: string | null
  logoUrl: string | null
  address: string
  phone: string
  whatsapp: string | null
  email: string
  website: string | null
  checkInTime: string
  checkOutTime: string
  createdAt: string
  updatedAt: string
  location: PropertyLocation
}

export interface UpdatePropertySettingsInput {
  districtId?: number
  address?: string
  phone?: string
  email?: string
  tradeName?: string | null
  description?: string | null
  logoUrl?: string | null
  whatsapp?: string | null
  website?: string | null
  checkInTime?: string
  checkOutTime?: string
}

export interface GeoItem {
  id: number
  uuid: string
  name: string
}
