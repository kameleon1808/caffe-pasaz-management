/**
 * @file src/api/salaries.ts
 * @description API klijent za isplate plata.
 *              API client for salary payments.
 */

import { getAuthHeader } from '../utils/token'

const BASE = 'http://localhost:3001/api/v1/salaries'

/** Zapis o isplati plate / Salary payment record */
export interface SalaryRecord {
  id:        number
  userId:    number
  amount:    number
  note:      string | null
  paidAt:    string
  paidById:  number
  createdAt: string
  user:   { id: number; fullName: string; username: string }
  paidBy: { id: number; fullName: string; username: string }
}

/** Podaci za kreiranje isplate / Data for creating a salary payment */
export interface CreateSalaryData {
  userId:  number
  amount:  number
  note?:   string
  paidAt?: string
}

/** Filteri za pretragu isplata / Filters for salary search */
export interface SalaryFilters {
  userId?:   number
  dateFrom?: string
  dateTo?:   string
}

/** Pomoćna funkcija za autorizovane zahteve / Helper for authorized requests */
async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res  = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader, ...options.headers },
  })
  const json = await res.json() as {
    success: boolean
    data?: T
    message?: string
    error?: { code: string; message: string; details?: unknown }
  }

  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & { code?: string; details?: unknown }
    err.code    = json.error?.code
    err.details = json.error?.details
    throw err
  }
  return json.data as T
}

/**
 * Vraća sve isplate plate sa opcionalnim filterima.
 * Returns all salary payments with optional filters.
 *
 * @param {SalaryFilters} [filters] - Opcioni filteri / Optional filters
 */
export function getSalaries(filters: SalaryFilters = {}): Promise<SalaryRecord[]> {
  const params = new URLSearchParams()
  if (filters.userId   !== undefined) params.set('userId',   String(filters.userId))
  if (filters.dateFrom !== undefined) params.set('dateFrom', filters.dateFrom)
  if (filters.dateTo   !== undefined) params.set('dateTo',   filters.dateTo)

  const qs = params.toString()
  return req<SalaryRecord[]>(qs ? `${BASE}?${qs}` : BASE)
}

/**
 * Kreira novu isplatu plate.
 * Creates a new salary payment.
 *
 * @param {CreateSalaryData} data - Podaci o isplati / Payment data
 */
export const createSalary = (data: CreateSalaryData): Promise<SalaryRecord> =>
  req<SalaryRecord>(BASE, { method: 'POST', body: JSON.stringify(data) })
