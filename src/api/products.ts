/**
 * @file src/api/products.ts
 * @description API klijent za proizvode.
 *              API client for products.
 */

import { authRequest } from './apiClient'
import type { Product } from '../types'

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
  return authRequest<Product[]>(`/products${qs ? '?' + qs : ''}`)
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
  authRequest<Product>('/products', { method: 'POST', body: JSON.stringify(data) })

/** Menja proizvod / Updates a product */
export const updateProduct = (id: number, data: Partial<CreateProductPayload & { active: boolean }>) =>
  authRequest<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })

/** Deaktivira proizvod / Deactivates a product */
export const deleteProduct = (id: number) =>
  authRequest<void>(`/products/${id}`, { method: 'DELETE' })
