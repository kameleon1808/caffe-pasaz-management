/**
 * @file server/lib/prisma.ts
 * @description Deljeni singleton Prisma klijent za ceo server.
 *              Shared singleton Prisma client for the entire server.
 *
 * Importuj odavde u svim servisima da bi se koristila jedna konekcija.
 * Import from here in all services to use a single connection.
 */

import { PrismaClient } from '@prisma/client'

/** Singleton Prisma instanca / Singleton Prisma instance */
export const prisma = new PrismaClient()
