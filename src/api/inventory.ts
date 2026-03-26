/**
 * @file src/api/inventory.ts
 * @description API klijent za magacin i zalihe.
 *              API client for warehouse and inventory.
 */

import { getAuthHeader } from '../utils/token'
import type { Product, Category } from '../types'

const BASE = 'http://localhost:3001/api/v1/inventory'

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
  return (json.data ?? json.message) as T
}

/** Proizvod sa stanjem i zastavicom za nisko stanje / Product with stock and low-stock flag */
export interface InventoryItem extends Product {
  category:   Category
  isLowStock: boolean
}

/** Stavka prijema robe / Goods receipt item */
export interface PurchaseItem {
  productId: number
  quantity:  number
  note?:     string
}

/** Vraća pregled stanja magacina / Returns inventory overview */
export const fetchInventory = (categoryId?: number) => {
  const qs = categoryId ? `?categoryId=${categoryId}` : ''
  return req<InventoryItem[]>(`${BASE}${qs}`)
}

/** Šalje prijem robe / Sends goods receipt */
export const submitPurchase = (items: PurchaseItem[], shiftId?: number) =>
  req<string>(BASE + '/purchase', {
    method: 'POST',
    body:   JSON.stringify({ items, shiftId })
  })

/** Šalje korekciju stanja / Sends stock adjustment */
export const submitAdjustment = (productId: number, changeQty: number, note: string) =>
  req<string>(BASE + '/adjust', {
    method: 'POST',
    body:   JSON.stringify({ productId, changeQty, note })
  })

/** Vraća istoriju promena za jedan proizvod / Returns change history for a product */
export const fetchProductHistory = (productId: number) =>
  req<unknown[]>(`${BASE}/${productId}/history`)
