import { getSession } from 'next-auth/react'

import type { ApiError, DocumentType } from '@/types/apps/clientsTypes'
import { DOCUMENT_TYPES } from '@/types/apps/clientsTypes'
import type {
  CreateEmployeeInput,
  CreateRoleInput,
  Employee,
  Permission,
  PermissionGroup,
  Role,
  RolePermission,
  UpdateEmployeeInput,
  UpdateRoleInput
} from '@/types/apps/staffTypes'

const getApiBase = () => {
  if (typeof window === 'undefined') {
    return process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'
}

export const getStaffApiErrorMessage = (error: unknown, fallback = 'Ocurrió un error.') => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as ApiError).message

    if (Array.isArray(message) && message.length > 0) {
      return message.join('\n')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

const emptyToNull = (value?: string | null) => {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

const normalizeDocumentType = (value: unknown): DocumentType | null => {
  const next = String(value || '').toUpperCase()

  return (DOCUMENT_TYPES as readonly string[]).includes(next) ? (next as DocumentType) : null
}

const normalizeRole = (role: Role): Role => ({
  ...role,
  description: role.description ?? null,
  permissions: Array.isArray(role.permissions) ? role.permissions : []
})

const normalizeEmployee = (employee: Employee): Employee => ({
  ...employee,
  jobTitle: employee.jobTitle ?? null,
  hireDate: employee.hireDate ?? null,
  terminationDate: employee.terminationDate ?? null,
  person: {
    ...employee.person,
    documentType: normalizeDocumentType(employee.person?.documentType),
    documentNumber: employee.person?.documentNumber ?? null,
    phone: employee.person?.phone ?? null,
    email: employee.person?.email ?? null,
    address: employee.person?.address ?? null,
    birthDate: employee.person?.birthDate ?? null
  },
  user: employee.user ?? null,
  roles: Array.isArray(employee.roles) ? employee.roles : []
})

const resolveToken = async (token?: string) => {
  if (token) {
    return token
  }

  const session = await getSession()

  return session?.accessToken
}

const request = async <T>(path: string, init: RequestInit = {}, token?: string): Promise<T> => {
  const accessToken = await resolveToken(token)

  const res = await fetch(`${getApiBase()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers
    }
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw (data as ApiError) ?? { message: ['Ocurrió un error.'], error: 'Error', statusCode: res.status }
  }

  return data as T
}

const toRolePayload = (body: CreateRoleInput | UpdateRoleInput) => {
  const payload: UpdateRoleInput = {}

  if (body.name !== undefined) payload.name = body.name.trim()
  if (body.description !== undefined) payload.description = emptyToNull(body.description)
  if (body.permissionIds !== undefined) payload.permissionIds = body.permissionIds

  return payload
}

const toEmployeePayload = (body: CreateEmployeeInput | UpdateEmployeeInput) => {
  const payload: UpdateEmployeeInput = {}

  if (body.email !== undefined) payload.email = body.email.trim()
  if (body.firstName !== undefined) payload.firstName = body.firstName.trim()
  if (body.lastName !== undefined) payload.lastName = body.lastName.trim()
  if (body.password !== undefined) {
    const password = body.password?.trim()

    if (password) {
      payload.password = password
    }
  }
  if (body.documentType !== undefined) payload.documentType = body.documentType || null
  if (body.documentNumber !== undefined) payload.documentNumber = emptyToNull(body.documentNumber)
  if (body.phone !== undefined) payload.phone = emptyToNull(body.phone)
  if (body.address !== undefined) payload.address = emptyToNull(body.address)
  if (body.birthDate !== undefined) payload.birthDate = emptyToNull(body.birthDate)
  if (body.jobTitle !== undefined) payload.jobTitle = emptyToNull(body.jobTitle)
  if (body.hireDate !== undefined) payload.hireDate = emptyToNull(body.hireDate)
  if (body.terminationDate !== undefined) payload.terminationDate = emptyToNull(body.terminationDate)
  if (body.roles !== undefined) payload.roles = body.roles

  return payload
}

export const rolesApi = {
  list: async (propertyId: number, token?: string) => {
    const data = await request<Role[]>(`/properties/${propertyId}/roles`, {}, token)

    return Array.isArray(data) ? data.map(normalizeRole) : []
  },
  get: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeRole(await request<Role>(`/properties/${propertyId}/roles/${uuid}`, {}, token))
  },
  permissions: async (propertyId: number, uuid: string, token?: string) => {
    const data = await request<RolePermission[]>(`/properties/${propertyId}/roles/${uuid}/permissions`, {}, token)

    return Array.isArray(data) ? data : []
  },
  create: async (propertyId: number, body: CreateRoleInput, token?: string) => {
    return normalizeRole(
      await request<Role>(
        `/properties/${propertyId}/roles`,
        { method: 'POST', body: JSON.stringify(toRolePayload(body)) },
        token
      )
    )
  },
  update: async (propertyId: number, uuid: string, body: UpdateRoleInput, token?: string) => {
    return normalizeRole(
      await request<Role>(
        `/properties/${propertyId}/roles/${uuid}`,
        { method: 'PATCH', body: JSON.stringify(toRolePayload(body)) },
        token
      )
    )
  },
  remove: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeRole(await request<Role>(`/properties/${propertyId}/roles/${uuid}`, { method: 'DELETE' }, token))
  }
}

export const permissionGroupsApi = {
  list: async (token?: string) => {
    const data = await request<PermissionGroup[]>('/permission-groups', {}, token)

    return Array.isArray(data) ? data : []
  }
}

export const permissionsApi = {
  list: async (token?: string) => {
    const data = await request<Permission[]>('/permissions', {}, token)

    return Array.isArray(data) ? data : []
  }
}

export const employeesApi = {
  list: async (propertyId: number, token?: string) => {
    const data = await request<Employee[]>(`/properties/${propertyId}/employees`, {}, token)

    return Array.isArray(data) ? data.map(normalizeEmployee) : []
  },
  get: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeEmployee(await request<Employee>(`/properties/${propertyId}/employees/${uuid}`, {}, token))
  },
  create: async (propertyId: number, body: CreateEmployeeInput, token?: string) => {
    return normalizeEmployee(
      await request<Employee>(
        `/properties/${propertyId}/employees`,
        { method: 'POST', body: JSON.stringify(toEmployeePayload(body)) },
        token
      )
    )
  },
  update: async (propertyId: number, uuid: string, body: UpdateEmployeeInput, token?: string) => {
    return normalizeEmployee(
      await request<Employee>(
        `/properties/${propertyId}/employees/${uuid}`,
        { method: 'PATCH', body: JSON.stringify(toEmployeePayload(body)) },
        token
      )
    )
  },
  remove: async (propertyId: number, uuid: string, token?: string) => {
    return normalizeEmployee(
      await request<Employee>(`/properties/${propertyId}/employees/${uuid}`, { method: 'DELETE' }, token)
    )
  }
}
