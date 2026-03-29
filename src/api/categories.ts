/**
 * @file src/api/categories.ts
 * @description API klijent za kategorije proizvoda.
 *              API client for product categories.
 */

import { authRequest } from './apiClient'
import type { Category } from '../types'

/** Kategorija sa brojem aktivnih proizvoda / Category with active product count */
export interface CategoryWithCount extends Category {
  _count: { products: number }
}

/** Vraća sve kategorije / Returns all categories */
export const fetchCategories = (showInactive = false) =>
  authRequest<CategoryWithCount[]>(`/categories?showInactive=${showInactive}`)

/** Kreira novu kategoriju / Creates a new category */
export const createCategory = (data: { nameSr: string; nameEn: string; sortOrder?: number }) =>
  authRequest<Category>('/categories', { method: 'POST', body: JSON.stringify(data) })

/** Menja kategoriju / Updates a category */
export const updateCategory = (id: number, data: Partial<{ nameSr: string; nameEn: string; sortOrder: number; active: boolean }>) =>
  authRequest<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })

/** Deaktivira kategoriju / Deactivates a category */
export const deleteCategory = (id: number) =>
  authRequest<void>(`/categories/${id}`, { method: 'DELETE' })

/** Sačuva novi redosled / Saves new order */
export const reorderCategories = (items: { id: number; sortOrder: number }[]) =>
  authRequest<void>('/categories/reorder', { method: 'PATCH', body: JSON.stringify({ items }) })
