/**
 * @file src/api/products.ts
 * @description API klijent za proizvode.
 *              API client for products.
 */

import { getAuthHeader } from '../utils/token'
import type { Product }  from '../types'

const BASE = 'http://localhost:3001/api/v1/products'

async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res  = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader, ...options.headers }
  })
  const json = await res.json() as { success: boolean; data?: T; error?: { code: string; message: string } }

  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & { code?: string }
    err.code = json.error?.code
    throw err
  }
  return json.data as T
}

/** Filteri za proizvode / Product filters */
export interface ProductFilters {
  categoryId?:   number
  search?:       string
  showInactive?: boolean
}

/** Vraća listu proizvoda / Returns product list */
export function fetchProducts(filters: ProductFilters = {}) {
  const params = new URLSearchParams()
  if (filters.categoryId)   params.set('categoryId',   String(filters.categoryId))
  if (filters.search)       params.set('search',       filters.search)
  if (filters.showInactive) params.set('showInactive', 'true')
  const qs = params.toString()
  return req<Product[]>(`${BASE}${qs ? '?' + qs : ''}`)
}

/** Tip za kreiranje proizvoda / Type for creating a product */
export interface CreateProductPayload {
  categoryId:    number
  nameSr:        string
  nameEn:        string
  price:         number
  stockQuantity: number
  unit:          string
  normQuantity?: number
}

/** Kreira novi proizvod / Creates a new product */
export const createProduct = (data: CreateProductPayload) =>
  req<Product>(BASE, { method: 'POST', body: JSON.stringify(data) })

/** Menja proizvod / Updates a product */
export const updateProduct = (id: number, data: Partial<CreateProductPayload & { active: boolean }>) =>
  req<Product>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) })

/** Deaktivira proizvod / Deactivates a product */
export const deleteProduct = (id: number) =>
  req<void>(`${BASE}/${id}`, { method: 'DELETE' })
