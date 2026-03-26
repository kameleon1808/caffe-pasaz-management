/**
 * @file src/api/categories.ts
 * @description API klijent za kategorije proizvoda.
 *              API client for product categories.
 */

import { getAuthHeader } from '../utils/token'
import type { Category } from '../types'

const BASE = 'http://localhost:3001/api/v1/categories'

/** Pomoćna funkcija za autorizovane zahteve / Helper for authorized requests */
async function req<T>(url: string, options: RequestInit = {}): Promise<T> {
  const authHeader = getAuthHeader()
  if (!authHeader) throw new Error('Nije autentifikovan / Not authenticated')

  const res  = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader, ...options.headers }
  })
  const json = await res.json() as { success: boolean; data?: T; message?: string; error?: { code: string; message: string } }

  if (!res.ok || !json.success) {
    const err = new Error(json.error?.message ?? `HTTP ${res.status}`) as Error & { code?: string }
    err.code = json.error?.code
    throw err
  }
  return json.data as T
}

/** Kategorija sa brojem aktivnih proizvoda / Category with active product count */
export interface CategoryWithCount extends Category {
  _count: { products: number }
}

/** Vraća sve kategorije / Returns all categories */
export const fetchCategories  = (showInactive = false) =>
  req<CategoryWithCount[]>(`${BASE}?showInactive=${showInactive}`)

/** Kreira novu kategoriju / Creates a new category */
export const createCategory   = (data: { nameSr: string; nameEn: string; sortOrder?: number }) =>
  req<Category>(BASE, { method: 'POST', body: JSON.stringify(data) })

/** Menja kategoriju / Updates a category */
export const updateCategory   = (id: number, data: Partial<{ nameSr: string; nameEn: string; sortOrder: number; active: boolean }>) =>
  req<Category>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) })

/** Deaktivira kategoriju / Deactivates a category */
export const deleteCategory   = (id: number) =>
  req<void>(`${BASE}/${id}`, { method: 'DELETE' })

/** Sačuva novi redosled / Saves new order */
export const reorderCategories = (items: { id: number; sortOrder: number }[]) =>
  req<void>(`${BASE}/reorder`, { method: 'PATCH', body: JSON.stringify({ items }) })
