/**
 * @file src/components/ui/SkeletonLoader.tsx
 * @description Skeleton loader komponente za prikaz stanja učitavanja.
 *              Skeleton loader components for displaying loading state.
 *
 * Upotreba / Usage:
 * ```tsx
 * // Tabela / Table
 * {loading ? <TableSkeleton rows={5} columns={4} /> : <DataTable ... />}
 *
 * // Kartica / Card
 * {loading ? <CardSkeleton /> : <StatCard ... />}
 *
 * // Tekst / Text
 * <TextSkeleton lines={3} />
 * ```
 */

import React from 'react'

// ─── Bazni Skeleton ────────────────────────────────────────────────────────────

/**
 * Bazni skeleton blok sa shimmer animacijom.
 * Base skeleton block with shimmer animation.
 */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`bg-white/10 rounded animate-pulse ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

// ─── Skeleton tabele / Table skeleton ─────────────────────────────────────────

export interface TableSkeletonProps {
  /** Broj redova / Number of rows */
  rows?:    number
  /** Broj kolona / Number of columns */
  columns?: number
}

/**
 * Skeleton za DataTable komponentu.
 * Skeleton for the DataTable component.
 */
export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="w-full" aria-label="Učitavanje... / Loading..." aria-busy="true">
      {/* Zaglavlje tabele / Table header */}
      <div className="flex gap-4 px-4 py-3 border-b border-white/10">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Redovi tabele / Table rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-4 py-3 border-b border-white/5"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              className="h-4 flex-1"
              style={{ width: `${60 + Math.random() * 40}%`, maxWidth: '100%' } as React.CSSProperties}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton kartice / Card skeleton ─────────────────────────────────────────

/**
 * Skeleton za statističku karticu.
 * Skeleton for a statistics card.
 */
export function CardSkeleton() {
  return (
    <div
      className="bg-white/5 border border-white/10 rounded-xl p-5"
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-2/3 mb-3" />
      <Skeleton className="h-8 w-1/2 mb-2" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

/**
 * Skeleton za grid kartica (npr. dashboard).
 * Skeleton for a card grid (e.g. dashboard).
 */
export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  )
}

// ─── Skeleton teksta / Text skeleton ──────────────────────────────────────────

/**
 * Skeleton za blok teksta.
 * Skeleton for a text block.
 */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/6', 'w-2/3']
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${widths[i % widths.length]}`}
        />
      ))}
    </div>
  )
}

// ─── Fullscreen loader / Fullscreen loader ─────────────────────────────────────

/**
 * Fullscreen loader za inicijalno učitavanje stranice.
 * Fullscreen loader for initial page loading.
 */
export function FullscreenLoader({ message }: { message?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-64 gap-4"
      aria-label={message ?? 'Učitavanje... / Loading...'}
      aria-busy="true"
    >
      {/* Spinner */}
      <div className="w-10 h-10 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      {message && (
        <p className="text-sm text-white/50">{message}</p>
      )}
    </div>
  )
}
