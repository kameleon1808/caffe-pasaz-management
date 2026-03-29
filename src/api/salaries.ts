/**
 * @file src/api/salaries.ts
 * @description API klijent za isplate plata.
 *              API client for salary payments.
 */

import { authRequest } from './apiClient'

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
  return authRequest<SalaryRecord[]>(qs ? `/salaries?${qs}` : '/salaries')
}

/**
 * Kreira novu isplatu plate.
 * Creates a new salary payment.
 *
 * @param {CreateSalaryData} data - Podaci o isplati / Payment data
 */
export const createSalary = (data: CreateSalaryData): Promise<SalaryRecord> =>
  authRequest<SalaryRecord>('/salaries', { method: 'POST', body: JSON.stringify(data) })
