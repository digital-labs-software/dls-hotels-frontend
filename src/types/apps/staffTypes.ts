import type { DocumentType } from '@/types/apps/clientsTypes'

export type { DocumentType }

export interface RolePermission {
  id: number
  uuid: string
  name: string
  displayName: string
  permissionGroupId: number
  permissionGroupName: string
}

export interface Role {
  id: number
  uuid: string
  propertyId: number
  name: string
  description: string | null
  permissions: RolePermission[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoleInput {
  name: string
  description?: string | null
  permissionIds: number[]
}

export interface UpdateRoleInput {
  name?: string
  description?: string | null
  permissionIds?: number[]
}

export interface PermissionGroup {
  id: number
  uuid: string
  name: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: number
  uuid: string
  permissionGroupId: number
  name: string
  displayName: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface EmployeePerson {
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
}

export interface EmployeeUser {
  id: number
  uuid: string
  email: string
  hasPassword: boolean
  hasGoogle: boolean
  photoUrl: string | null
}

export interface EmployeeRole {
  id: number
  uuid: string
  name: string
  description: string | null
  isPrimary: boolean
}

export interface Employee {
  id: number
  uuid: string
  propertyId: number
  jobTitle: string | null
  hireDate: string | null
  terminationDate: string | null
  person: EmployeePerson
  user: EmployeeUser | null
  roles: EmployeeRole[]
  createdAt: string
  updatedAt: string
}

export interface EmployeeRoleAssignment {
  roleId: number
  isPrimary?: boolean
}

export interface CreateEmployeeInput {
  email: string
  firstName: string
  lastName: string
  password?: string
  documentType?: DocumentType | null
  documentNumber?: string | null
  phone?: string | null
  address?: string | null
  birthDate?: string | null
  jobTitle?: string | null
  hireDate?: string | null
  terminationDate?: string | null
  roles?: EmployeeRoleAssignment[]
}

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>
