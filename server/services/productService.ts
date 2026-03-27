/**
 * @file server/services/productService.ts
 * @description Servis za upravljanje proizvodima.
 *              Service for managing products.
 *
 * Poslovna pravila / Business rules:
 * - Brisanje je "soft delete" (active = false)
 * - Cena mora biti pozitivna
 * - Kategorija mora biti aktivna
 * - Deletion is "soft delete" (active = false)
 * - Price must be positive
 * - Category must be active
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/** Dozvoljene jedinice mere / Allowed units of measure */
export const ALLOWED_UNITS = ['kom', 'lit', 'dcl', 'flaša', 'g'] as const
export type Unit = typeof ALLOWED_UNITS[number]

/** Tip za kreiranje proizvoda / Type for creating a product */
export interface CreateProductData {
  categoryId:    number
  nameSr:        string
  nameEn:        string
  price:         number
  stockQuantity: number
  unit:          Unit
}

/** Tip za izmenu proizvoda / Type for updating a product */
export interface UpdateProductData {
  categoryId?:    number
  nameSr?:        string
  nameEn?:        string
  price?:         number
  stockQuantity?: number
  unit?:          Unit
  active?:        boolean
}

/** Filteri za listanje proizvoda / Filters for listing products */
export interface ProductFilters {
  categoryId?:     number
  search?:         string
  showInactive?:   boolean
}

/**
 * Vraća listu proizvoda sa opcionim filterima.
 * Returns a list of products with optional filters.
 *
 * @param {ProductFilters} filters - Filteri za pretragu / Search filters
 */
export async function getProducts(filters: ProductFilters = {}) {
  const { categoryId, search, showInactive = false } = filters

  return prisma.product.findMany({
    where: {
      ...(showInactive ? {} : { active: true }),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { nameSr: { contains: search } },
              { nameEn: { contains: search } }
            ]
          }
        : {})
    },
    include: { category: true },
    orderBy: [
      { category: { sortOrder: 'asc' } },
      { nameSr: 'asc' }
    ]
  })
}

/**
 * Vraća jedan proizvod prema ID-u.
 * Returns a single product by ID.
 *
 * @param {number} id - ID proizvoda / Product ID
 * @throws {AppError} Ako proizvod nije pronađen / If product not found
 */
export async function getProductById(id: number) {
  const product = await prisma.product.findUnique({
    where:   { id },
    include: { category: true }
  })
  if (!product) {
    throw new AppError(
      `Proizvod sa ID ${id} nije pronađen / Product with ID ${id} not found`,
      404, 'PRODUCT_NOT_FOUND'
    )
  }
  return product
}

/**
 * Kreira novi proizvod.
 * Creates a new product.
 *
 * @param {CreateProductData} data - Podaci za novi proizvod / Data for the new product
 * @throws {AppError} Ako kategorija nije aktivna ili cena nije validna / If category inactive or price invalid
 */
export async function createProduct(data: CreateProductData) {
  // Proveri da li kategorija postoji i da li je aktivna / Check category exists and is active
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
  if (!category || !category.active) {
    throw new AppError(
      'Kategorija nije pronađena ili nije aktivna / Category not found or not active',
      400, 'INVALID_CATEGORY'
    )
  }

  if (data.price <= 0) {
    throw new AppError(
      'Cena mora biti veća od 0 / Price must be greater than 0',
      400, 'INVALID_PRICE'
    )
  }

  if (data.stockQuantity < 0) {
    throw new AppError(
      'Količina ne može biti negativna / Quantity cannot be negative',
      400, 'INVALID_QUANTITY'
    )
  }

  if (!ALLOWED_UNITS.includes(data.unit)) {
    throw new AppError(
      `Jedinica mere mora biti: ${ALLOWED_UNITS.join(', ')} / Unit must be one of: ${ALLOWED_UNITS.join(', ')}`,
      400, 'INVALID_UNIT'
    )
  }

  return prisma.product.create({
    data:    { ...data, active: true },
    include: { category: true }
  })
}

/**
 * Menja podatke proizvoda.
 * Updates product data.
 *
 * @param {number}            id   - ID proizvoda / Product ID
 * @param {UpdateProductData} data - Polja za ažuriranje / Fields to update
 */
export async function updateProduct(id: number, data: UpdateProductData) {
  await getProductById(id)

  if (data.categoryId !== undefined) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
    if (!category || !category.active) {
      throw new AppError(
        'Kategorija nije pronađena ili nije aktivna / Category not found or not active',
        400, 'INVALID_CATEGORY'
      )
    }
  }

  if (data.price !== undefined && data.price <= 0) {
    throw new AppError(
      'Cena mora biti veća od 0 / Price must be greater than 0',
      400, 'INVALID_PRICE'
    )
  }

  if (data.unit !== undefined && !ALLOWED_UNITS.includes(data.unit)) {
    throw new AppError(
      `Jedinica mere mora biti: ${ALLOWED_UNITS.join(', ')} / Unit must be one of: ${ALLOWED_UNITS.join(', ')}`,
      400, 'INVALID_UNIT'
    )
  }

  return prisma.product.update({
    where:   { id },
    data,
    include: { category: true }
  })
}

/**
 * Deaktivira proizvod (soft delete).
 * Deactivates a product (soft delete).
 *
 * @param {number} id - ID proizvoda / Product ID
 */
export async function deleteProduct(id: number) {
  await getProductById(id)
  return prisma.product.update({
    where: { id },
    data:  { active: false }
  })
}
