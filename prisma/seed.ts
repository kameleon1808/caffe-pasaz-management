/**
 * @file prisma/seed.ts
 * @description Seed skript koji popunjava bazu podataka početnim podacima.
 *              Seed script that populates the database with initial data.
 *
 * Kreira:
 * - Default admin nalog (admin / admin123)
 * - 6 unutrašnjih stolova (Sto U1 - Sto U6)
 * - 12 spoljašnjih stolova (Sto S1 - Sto S12)
 * - Osnovne kategorije pića
 * - Osnovna sistemska podešavanja
 *
 * Creates:
 * - Default admin account (admin / admin123)
 * - 6 indoor tables (Sto U1 - Sto U6)
 * - 12 outdoor tables (Sto S1 - Sto S12)
 * - Basic drink categories
 * - Basic system settings
 *
 * Pokretanje / Run: tsx prisma/seed.ts
 * Ili / Or: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// SQLite ne podržava Prisma enum-e — koristimo string konstante
// SQLite doesn't support Prisma enums — we use string constants
const Role   = { ADMIN: 'ADMIN',   WAITER: 'WAITER' }   as const
const Zone   = { INDOOR: 'INDOOR', OUTDOOR: 'OUTDOOR' } as const

const prisma = new PrismaClient()

/**
 * Kreira inicijalnog admin korisnika ako već ne postoji.
 * Creates the initial admin user if one doesn't already exist.
 */
async function seedAdmin(): Promise<void> {
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' }
  })

  if (existingAdmin) {
    console.log('  ✓ Admin nalog već postoji / Admin account already exists')
    return
  }

  const hashedPassword = await bcrypt.hash('admin123', 12)

  await prisma.user.create({
    data: {
      username: 'admin',
      password: hashedPassword,
      fullName: 'Administrator',
      role: Role.ADMIN,
      active: true
    }
  })

  console.log('  ✓ Kreiran admin nalog: admin / admin123')
  console.log('  ✓ Created admin account: admin / admin123')
}

/**
 * Kreira default konobar nalog ako već ne postoji.
 * Creates the default waiter account if one doesn't already exist.
 */
async function seedWaiter(): Promise<void> {
  const existing = await prisma.user.findUnique({
    where: { username: 'konobar' }
  })

  if (existing) {
    console.log('  ✓ Konobar nalog već postoji / Waiter account already exists')
    return
  }

  const hashedPassword = await bcrypt.hash('konobar123', 12)

  await prisma.user.create({
    data: {
      username: 'konobar',
      password: hashedPassword,
      fullName: 'Konobar',
      role: Role.WAITER,
      active: true
    }
  })

  console.log('  ✓ Kreiran konobar nalog: konobar / konobar123')
  console.log('  ✓ Created waiter account: konobar / konobar123')
}

/**
 * Kreira stolove u kafeu (unutrašnji i spoljašnji).
 * Creates cafe tables (indoor and outdoor).
 */
async function seedTables(): Promise<void> {
  const tableCount = await prisma.tableUnit.count()

  if (tableCount > 0) {
    console.log(`  ✓ Stolovi već postoje (${tableCount}) / Tables already exist (${tableCount})`)
    return
  }

  // Unutrašnji stolovi / Indoor tables (U1 - U6)
  const indoorTables = Array.from({ length: 6 }, (_, i) => ({
    label:     `Sto U${i + 1}`,
    zone:      Zone.INDOOR,
    positionX: (i % 3) * 200 + 50,
    positionY: Math.floor(i / 3) * 200 + 50,
    isOccupied: false,
    active:    true
  }))

  // Spoljašnji stolovi / Outdoor tables (S1 - S12)
  const outdoorTables = Array.from({ length: 12 }, (_, i) => ({
    label:     `Sto S${i + 1}`,
    zone:      Zone.OUTDOOR,
    positionX: (i % 4) * 180 + 50,
    positionY: Math.floor(i / 4) * 180 + 50,
    isOccupied: false,
    active:    true
  }))

  await prisma.tableUnit.createMany({
    data: [...indoorTables, ...outdoorTables]
  })

  console.log('  ✓ Kreirano 6 unutrašnjih stolova (U1-U6) / Created 6 indoor tables (U1-U6)')
  console.log('  ✓ Kreirano 12 spoljašnjih stolova (S1-S12) / Created 12 outdoor tables (S1-S12)')
}

/**
 * Kreira osnovne kategorije pića.
 * Creates basic drink categories.
 */
async function seedCategories(): Promise<void> {
  const categoryCount = await prisma.category.count()

  if (categoryCount > 0) {
    console.log(`  ✓ Kategorije već postoje (${categoryCount}) / Categories already exist (${categoryCount})`)
    return
  }

  const categories = [
    { nameSr: 'Kafa',              nameEn: 'Coffee',          sortOrder: 1 },
    { nameSr: 'Gazirani sokovi',   nameEn: 'Fizzy Drinks',    sortOrder: 2 },
    { nameSr: 'Negazirani sokovi', nameEn: 'Still Drinks',    sortOrder: 3 },
    { nameSr: 'Pivo',              nameEn: 'Beer',            sortOrder: 4 },
    { nameSr: 'Vino',              nameEn: 'Wine',            sortOrder: 5 },
    { nameSr: 'Žestoki alkohol',   nameEn: 'Spirits',         sortOrder: 6 },
    { nameSr: 'Ostalo',            nameEn: 'Other',           sortOrder: 7 }
  ]

  await prisma.category.createMany({ data: categories })

  console.log(`  ✓ Kreirano ${categories.length} kategorija / Created ${categories.length} categories`)
}

/**
 * Kreira osnovna sistemska podešavanja.
 * Creates basic system settings.
 */
async function seedSettings(): Promise<void> {
  const settings = [
    { key: 'cafe_name',       value: 'Kafić Pasaz' },
    { key: 'cafe_address',    value: 'Adresa kafića' },
    { key: 'cafe_phone',      value: '+381 XX XXX XXXX' },
    { key: 'default_language', value: 'sr' },
    { key: 'currency',        value: 'RSD' },
    { key: 'tax_rate',        value: '0' }
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where:  { key: setting.key },
      update: { value: setting.value },
      create: setting
    })
  }

  console.log('  ✓ Kreirana sistemska podešavanja / Created system settings')
}

/**
 * Glavna seed funkcija.
 * Main seed function.
 */
async function main(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Kafić Pasaz — Inicijalizacija baze podataka')
  console.log('  Kafić Pasaz — Database Initialization')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  console.log('📋 Admin nalog / Admin account:')
  await seedAdmin()

  console.log('\n👤 Konobar nalog / Waiter account:')
  await seedWaiter()

  console.log('\n🪑 Stolovi / Tables:')
  await seedTables()

  console.log('\n📂 Kategorije / Categories:')
  await seedCategories()

  console.log('\n⚙️  Podešavanja / Settings:')
  await seedSettings()

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ✅ Baza podataka uspešno inicijalizovana!')
  console.log('  ✅ Database successfully initialized!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

main()
  .catch((error) => {
    console.error('❌ Greška pri inicijalizaciji / Initialization error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
