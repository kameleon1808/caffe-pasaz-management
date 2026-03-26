/**
 * @file src/types/index.ts
 * @description Centralizovani TypeScript tipovi za celu React aplikaciju.
 *              Centralized TypeScript types for the entire React application.
 *
 * Svi tipovi koji se koriste na frontendu su definisani ovde da bi se
 * osigurala konzistentnost i lakše održavanje.
 *
 * All types used on the frontend are defined here to ensure
 * consistency and easier maintenance.
 */

// ==============================================================================
// ENUMERACIJE / ENUMERATIONS
// ==============================================================================

/** Uloge korisnika / User roles */
export type Role = 'ADMIN' | 'WAITER'

/** Zone u kafeu / Cafe zones */
export type Zone = 'INDOOR' | 'OUTDOOR'

/** Status računa / Bill status */
export type BillStatus = 'OPEN' | 'PAID' | 'CANCELLED'

/** Boja prometa / Revenue color */
export type Color = 'WHITE' | 'BLACK'

/** Tip promene inventara / Inventory change type */
export type InventoryType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'WASTE'

// ==============================================================================
// KORISNIK / USER
// ==============================================================================

/**
 * Osnovni podaci o korisniku koji se čuvaju u JWT tokenu i local state-u.
 * Basic user data stored in JWT token and local state.
 */
export interface AuthUser {
  id:       number
  username: string
  fullName: string
  role:     Role
}

/**
 * Kompletan profil korisnika sa svim poljima.
 * Complete user profile with all fields.
 */
export interface UserProfile extends AuthUser {
  active:    boolean
  createdAt: string
}

// ==============================================================================
// AUTENTIFIKACIJA / AUTHENTICATION
// ==============================================================================

/**
 * Podaci koji se šalju na login endpoint.
 * Data sent to the login endpoint.
 */
export interface LoginCredentials {
  username: string
  password: string
}

/**
 * Odgovor koji stigne od servera nakon uspešnog logina.
 * Response received from the server after successful login.
 */
export interface LoginResponse {
  token: string
  user:  AuthUser
}

// ==============================================================================
// API ODGOVOR / API RESPONSE
// ==============================================================================

/**
 * Generički tip za uspešan API odgovor.
 * Generic type for a successful API response.
 *
 * @template T - Tip podataka u 'data' polju / Type of data in 'data' field
 */
export interface ApiSuccess<T> {
  success: true
  data:    T
}

/**
 * Tip za neuspešan API odgovor (greška).
 * Type for a failed API response (error).
 */
export interface ApiError {
  success: false
  error: {
    code:     string
    message:  string
    details?: unknown
  }
}

/**
 * Unija uspešnog i neuspešnog API odgovora.
 * Union of successful and failed API responses.
 */
export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ==============================================================================
// STO / TABLE
// ==============================================================================

/**
 * Fizički sto u kafeu.
 * Physical table in the cafe.
 */
export interface TableUnit {
  id:         number
  label:      string
  zone:       Zone
  positionX:  number
  positionY:  number
  isOccupied: boolean
  active:     boolean
}

// ==============================================================================
// KATEGORIJA I PROIZVOD / CATEGORY AND PRODUCT
// ==============================================================================

/**
 * Kategorija pića.
 * Drink category.
 */
export interface Category {
  id:        number
  nameSr:    string
  nameEn:    string
  sortOrder: number
  active:    boolean
}

/**
 * Proizvod koji se prodaje u kafeu.
 * Product sold in the cafe.
 */
export interface Product {
  id:            number
  categoryId:    number
  nameSr:        string
  nameEn:        string
  price:         number
  stockQuantity: number
  unit:          string
  active:        boolean
  category?:     Category
}

// ==============================================================================
// SMENA / SHIFT
// ==============================================================================

/**
 * Radna smena konobara.
 * Waiter work shift.
 */
export interface Shift {
  id:           number
  userId:       number
  startedAt:    string
  endedAt:      string | null
  totalWhite:   number
  totalBlack:   number
  totalRevenue: number
}

// ==============================================================================
// NAVIGACIJA / NAVIGATION
// ==============================================================================

/**
 * Stavka u meniju navigacije.
 * Navigation menu item.
 */
export interface NavItem {
  /** Ključ za prevod iz i18n / Translation key from i18n */
  labelKey:  string
  /** Putanja rute / Route path */
  path:      string
  /** Ikonina (Heroicons ime) / Icon (Heroicons name) */
  icon:      string
  /** Koje uloge mogu videti ovu stavku / Which roles can see this item */
  roles:     Role[]
  /** Razdvajač ispred stavke / Divider before this item */
  divider?:  boolean
}
