export type DocumentType = 'DNI' | 'RUC' | 'PASSPORT' | 'FOREIGNER_CARD' | 'OTHER'

export type CompanyType = 'CORPORATE' | 'INSTITUTION' | 'AGENCY' | 'OTHER'

export const DOCUMENT_TYPES = ['DNI', 'RUC', 'PASSPORT', 'FOREIGNER_CARD', 'OTHER'] as const

export const COMPANY_TYPES = ['CORPORATE', 'INSTITUTION', 'AGENCY', 'OTHER'] as const

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DNI: 'DNI',
  RUC: 'RUC',
  PASSPORT: 'Pasaporte',
  FOREIGNER_CARD: 'Carné de extranjería',
  OTHER: 'Otro'
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  CORPORATE: 'Empresa',
  INSTITUTION: 'Institución',
  AGENCY: 'Agencia',
  OTHER: 'Otro'
}

export interface GuestPerson {
  id: number
  uuid: string
  documentType: DocumentType | null
  documentNumber: string | null
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  address: string | null
  birthDate: string | null
  isEmployee: boolean
}

export interface GuestUser {
  id: number
  uuid: string
  email: string
  photoUrl: string | null
}

export interface Guest {
  id: number
  uuid: string
  notes: string | null
  propertyId: number
  person: GuestPerson
  user: GuestUser | null
  createdAt: string
  updatedAt: string
}

export interface CreateGuestInput {
  firstName: string
  lastName: string
  documentType?: DocumentType | null
  documentNumber?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  birthDate?: string | null
  notes?: string | null
}

export type UpdateGuestInput = Partial<CreateGuestInput>

export interface Company {
  id: number
  uuid: string
  propertyId: number
  companyType: CompanyType
  taxNumber: string | null
  businessName: string
  tradeName: string | null
  phone: string | null
  email: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCompanyInput {
  businessName: string
  companyType?: CompanyType
  taxNumber?: string | null
  tradeName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

export type UpdateCompanyInput = Partial<CreateCompanyInput>

export interface ApiError {
  message: string | string[]
  error: string
  statusCode: number
}
