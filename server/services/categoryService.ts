/**
 * @file server/services/categoryService.ts
 * @description Servis za upravljanje kategorijama proizvoda.
 *              Service for managing product categories.
 *
 * Poslovna pravila / Business rules:
 * - Brisanje je "soft delete" (active = false), ne fizičko brisanje
 * - sortOrder se automatski dodeljuje ako nije prosleđen (max + 1)
 * - Naziv mora biti jedinstven (po nameSr i nameEn odvojeno)
 * - Deletion is "soft delete" (active = false), not physical deletion
 * - sortOrder is auto-assigned if not provided (max + 1)
 * - Name must be unique (by nameSr and nameEn separately)
 */

import { prisma }   from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'

/** Tip za kreiranje kategorije / Type for creating a category */
export interface CreateCategoryData {
  nameSr:     string
  nameEn:     string
  sortOrder?: number
}

/** Tip za izmenu kategorije / Type for updating a category */
export interface UpdateCategoryData {
  nameSr?:    string
  nameEn?:    string
  sortOrder?: number
  active?:    boolean
}

/** Tip za preuređivanje redosleda / Type for reordering */
export interface ReorderItem {
  id:        number
  sortOrder: number
}

/**
 * Vraća sve kategorije sortirane po sortOrder-u.
 * Returns all categories sorted by sortOrder.
 *
 * @param {boolean} onlyActive - Ako true, vraća samo aktivne (default: true) / If true, return only active (default: true)
 */
export async function getCategories(onlyActive = true) {
  return prisma.category.findMany({
    where:   onlyActive ? { active: true } : undefined,
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { products: { where: { active: true } } }
      }
    }
  })
}

/**
 * Vraća jednu kategoriju prema ID-u.
 * Returns a single category by ID.
 *
 * @param {number} id - ID kategorije / Category ID
 * @throws {AppError} Ako kategorija nije pronađena / If category not found
 */
export async function getCategoryById(id: number) {
  const category = await prisma.category.findUnique({ where: { id } })
  if (!category) {
    throw new AppError(
      `Kategorija sa ID ${id} nije pronađena / Category with ID ${id} not found`,
      404, 'CATEGORY_NOT_FOUND'
    )
  }
  return category
}

/**
 * Kreira novu kategoriju.
 * Creates a new category.
 *
 * @param {CreateCategoryData} data - Podaci za novu kategoriju / Data for the new category
 * @throws {AppError} Ako naziv već postoji / If name already exists
 */
export async function createCategory(data: CreateCategoryData) {
  // Proveri duplikate (aktivne i neaktivne) / Check for duplicates (active and inactive)
  const duplicate = await prisma.category.findFirst({
    where: {
      OR: [
        { nameSr: { equals: data.nameSr } },
        { nameEn: { equals: data.nameEn } }
      ]
    },
    include: { _count: { select: { products: { where: { active: true } } } } }
  })

  if (duplicate) {
    if (!duplicate.active) {
      // Postoji ali je deaktivirana — frontend treba da ponudi reaktivaciju
      // Exists but is deactivated — frontend should offer reactivation
      throw new AppError(
        'Kategorija sa ovim imenom je deaktivirana / A category with this name is deactivated',
        409, 'CATEGORY_DUPLICATE_INACTIVE',
        { existingCategory: duplicate }
      )
    }
    throw new AppError(
      'Kategorija sa ovim imenom već postoji / A category with this name already exists',
      409, 'CATEGORY_DUPLICATE'
    )
  }

  // Auto sortOrder / Auto sort order
  let sortOrder = data.sortOrder
  if (sortOrder === undefined) {
    const last = await prisma.category.findFirst({ orderBy: { sortOrder: 'desc' } })
    sortOrder = (last?.sortOrder ?? -1) + 1
  }

  return prisma.category.create({
    data: { nameSr: data.nameSr, nameEn: data.nameEn, sortOrder, active: true }
  })
}

/**
 * Menja podatke kategorije.
 * Updates category data.
 *
 * @param {number}             id   - ID kategorije / Category ID
 * @param {UpdateCategoryData} data - Polja za ažuriranje / Fields to update
 * @throws {AppError} Ako kategorija nije pronađena ili naziv duplikat / If not found or name duplicate
 */
export async function updateCategory(id: number, data: UpdateCategoryData) {
  await getCategoryById(id) // baca AppError ako ne postoji / throws AppError if not found

  // Proveri duplikate samo za polja koja se menjaju / Check duplicates only for changed fields
  if (data.nameSr || data.nameEn) {
    const duplicate = await prisma.category.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              ...(data.nameSr ? [{ nameSr: { equals: data.nameSr } }] : []),
              ...(data.nameEn ? [{ nameEn: { equals: data.nameEn } }] : [])
            ]
          }
        ]
      }
    })
    if (duplicate) {
      throw new AppError(
        'Kategorija sa ovim imenom već postoji / A category with this name already exists',
        409, 'CATEGORY_DUPLICATE'
      )
    }
  }

  return prisma.category.update({ where: { id }, data })
}

/**
 * Deaktivira kategoriju (soft delete).
 * Deactivates a category (soft delete).
 *
 * @param {number} id - ID kategorije / Category ID
 * @throws {AppError} Ako kategorija ima aktivne proizvode / If category has active products
 */
export async function deleteCategory(id: number) {
  await getCategoryById(id)

  // Ne dozvoli brisanje ako ima aktivnih proizvoda / Don't allow deletion if it has active products
  const activeProducts = await prisma.product.count({
    where: { categoryId: id, active: true }
  })
  if (activeProducts > 0) {
    throw new AppError(
      `Kategorija ima ${activeProducts} aktivnih proizvoda. Deaktivirajte ih prvo. / Category has ${activeProducts} active products. Deactivate them first.`,
      409, 'CATEGORY_HAS_PRODUCTS'
    )
  }

  return prisma.category.update({ where: { id }, data: { active: false } })
}

/**
 * Sačuva novi redosled kategorija nakon drag-and-drop operacije.
 * Saves the new category order after a drag-and-drop operation.
 *
 * @param {ReorderItem[]} items - Niz ID i novih sortOrder vrednosti / Array of IDs and new sortOrder values
 */
export async function reorderCategories(items: ReorderItem[]): Promise<void> {
  // Ažuriraj sve u paraleli / Update all in parallel
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      prisma.category.update({ where: { id }, data: { sortOrder } })
    )
  )
}
