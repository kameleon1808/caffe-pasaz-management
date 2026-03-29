/**
 * @file src/api/inventory.ts
 * @description API klijent za magacin i zalihe.
 *              API client for warehouse and inventory.
 */

import { authRequest } from './apiClient'
import type { Product, Category } from '../types'

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
  return authRequest<InventoryItem[]>(`/inventory${qs}`)
}

/** Šalje prijem robe / Sends goods receipt */
export const submitPurchase = (items: PurchaseItem[], shiftId?: number) =>
  authRequest<string>('/inventory/purchase', {
    method: 'POST',
    body:   JSON.stringify({ items, shiftId })
  })

/** Šalje korekciju stanja / Sends stock adjustment */
export const submitAdjustment = (productId: number, changeQty: number, note: string) =>
  authRequest<string>('/inventory/adjust', {
    method: 'POST',
    body:   JSON.stringify({ productId, changeQty, note })
  })

/** Vraća istoriju promena za jedan proizvod / Returns change history for a product */
export const fetchProductHistory = (productId: number) =>
  authRequest<unknown[]>(`/inventory/${productId}/history`)
