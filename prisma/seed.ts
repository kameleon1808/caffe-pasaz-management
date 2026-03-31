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
 * - 77 proizvoda iz šank liste kafića (cene su 0 — postaviti u admin panelu)
 * - Osnovna sistemska podešavanja
 *
 * Creates:
 * - Default admin account (admin / admin123)
 * - 6 indoor tables (Sto U1 - Sto U6)
 * - 12 outdoor tables (Sto S1 - Sto S12)
 * - Basic drink categories
 * - 77 products from the cafe bar list (prices set to 0 — update via admin panel)
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
 * Kreira proizvode po kategorijama (kompletan demo meni).
 * Creates products by category (full demo menu).
 */
async function seedProducts(): Promise<void> {
  const productCount = await prisma.product.count()

  if (productCount > 0) {
    console.log(`  ✓ Proizvodi već postoje (${productCount}) / Products already exist (${productCount})`)
    return
  }

  // Dohvati sve kategorije / Fetch all categories
  const categories = await prisma.category.findMany()
  const catMap = Object.fromEntries(categories.map(c => [c.nameSr, c.id]))

  const products = [
    // ── Kafa / Coffee ───────────────────────────────────────────────────────
    { categoryId: catMap['Kafa'],              nameSr: 'Espresso',             nameEn: 'Espresso',                     price: 0, unit: 'kom', stockQuantity: 100, normQuantity: 1 },
    { categoryId: catMap['Kafa'],              nameSr: 'Nes',                  nameEn: 'Instant Coffee',               price: 0, unit: 'kom', stockQuantity: 100, normQuantity: 1 },
    { categoryId: catMap['Kafa'],              nameSr: 'Domaća kafa',          nameEn: 'Turkish Coffee',               price: 0, unit: 'kom', stockQuantity: 100, normQuantity: 1 },

    // ── Gazirani sokovi / Fizzy Drinks ───────────────────────────────────────
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Guarana',              nameEn: 'Guarana',                      price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'RedBull',              nameEn: 'Red Bull',                     price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Coca Cola',            nameEn: 'Coca Cola',                    price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Cokta',                nameEn: 'Cockta',                       price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Sprite',               nameEn: 'Sprite',                       price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Fanta',                nameEn: 'Fanta',                        price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Biter',                nameEn: 'Bitter Lemon',                 price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Tonik',                nameEn: 'Tonic Water',                  price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Coca Cola PVC',        nameEn: 'Coca Cola PVC',                price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Fanta PVC',            nameEn: 'Fanta PVC',                    price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Biter PVC',            nameEn: 'Bitter Lemon PVC',             price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Tonik PVC',            nameEn: 'Tonic Water PVC',              price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Limun',                nameEn: 'Lemon Drink',                  price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Pomorandža',           nameEn: 'Orange Drink',                 price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Gazirani sokovi'],   nameSr: 'Grejp',                nameEn: 'Grapefruit Drink',             price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },

    // ── Negazirani sokovi / Still Drinks ────────────────────────────────────
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Cedevita - više vrsta', nameEn: 'Cedevita (various)',          price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Romerquelle',          nameEn: 'Römerquelle Still Water',      price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Next breskva',         nameEn: 'Next Peach Juice',             price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Next jagoda',          nameEn: 'Next Strawberry Juice',        price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Next jabuka',          nameEn: 'Next Apple Juice',             price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Next borovnica',       nameEn: 'Next Blueberry Juice',         price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Next narandža',        nameEn: 'Next Orange Juice',            price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Fuze Tea',             nameEn: 'Fuze Tea',                     price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Knjaz Miloš',          nameEn: 'Knjaz Miloš Mineral Water',    price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Rosa',                 nameEn: 'Rosa Still Water',             price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Đus PVC',              nameEn: 'Juice PVC',                    price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Borovnica PVC',        nameEn: 'Blueberry Juice PVC',          price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'Ananas PVC',           nameEn: 'Pineapple Juice PVC',          price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'ASP malina',           nameEn: 'ASP Raspberry',                price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Negazirani sokovi'], nameSr: 'ASP jabuka',           nameEn: 'ASP Apple',                    price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },

    // ── Pivo / Beer ──────────────────────────────────────────────────────────
    { categoryId: catMap['Pivo'],              nameSr: 'Somersby jabuka',      nameEn: 'Somersby Apple Cider',         price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Somersby kruška',      nameEn: 'Somersby Pear Cider',          price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Heineken',             nameEn: 'Heineken',                     price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Blank',                nameEn: 'Blank Beer',                   price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Valjevsko 0,33',       nameEn: 'Valjevsko Beer 0.33l',         price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Banjalučko',           nameEn: 'Banjalučko Beer',              price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Birra Moretti',        nameEn: 'Birra Moretti',                price: 0, unit: 'kom', stockQuantity: 40, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Nikšićko 0,5',         nameEn: 'Nikšićko Beer 0.5l',           price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Nikšićko 0,33',        nameEn: 'Nikšićko Beer 0.33l',          price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Bavaria 0,5',          nameEn: 'Bavaria Beer 0.5l',            price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Bavaria 0,25',         nameEn: 'Bavaria Beer 0.25l',           price: 0, unit: 'kom', stockQuantity: 60, normQuantity: 1 },
    { categoryId: catMap['Pivo'],              nameSr: 'Heineken 0,00',        nameEn: 'Heineken 0.00% Non-alcoholic', price: 0, unit: 'kom', stockQuantity: 40, normQuantity: 1 },

    // ── Vino / Wine ──────────────────────────────────────────────────────────
    { categoryId: catMap['Vino'],              nameSr: 'Roze vino',            nameEn: 'Rosé Wine',                    price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Vino'],              nameSr: 'Belo vino',            nameEn: 'White Wine',                   price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Vino'],              nameSr: 'Crveno vino',          nameEn: 'Red Wine',                     price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Vino'],              nameSr: 'Tamjanika',            nameEn: 'Tamjanika White Wine',         price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },

    // ── Žestoki alkohol / Spirits ────────────────────────────────────────────
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Šljiva',               nameEn: 'Plum Brandy',                  price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Dunja',                nameEn: 'Quince Brandy',                price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Kajsija',              nameEn: 'Apricot Brandy',               price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Kruška',               nameEn: 'Pear Brandy',                  price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Medovača',             nameEn: 'Honey Brandy',                 price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Loza',                 nameEn: 'Grape Brandy',                 price: 0, unit: 'kom', stockQuantity: 30, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Balantajns',           nameEn: "Ballantine's Whisky",          price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Džek',                 nameEn: 'Jack Daniels Whiskey',         price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Džejmison',            nameEn: 'Jameson Whiskey',              price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Džim Bim',             nameEn: 'Jim Beam Whiskey',             price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Džoni Voker',          nameEn: 'Johnnie Walker Whisky',        price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Smirnof',              nameEn: 'Smirnoff Vodka',               price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Tekila',               nameEn: 'Tequila',                      price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Džin',                 nameEn: 'Gin',                          price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Vodka Baltik',         nameEn: 'Baltic Vodka',                 price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Vinjak 5',             nameEn: 'Vinjak 5 Brandy',              price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Vinjak Rubin',         nameEn: 'Vinjak Rubin Brandy',          price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Jeger',                nameEn: 'Jägermeister',                 price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Gorki list',           nameEn: 'Gorki List Bitter',            price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Old Pascas Rum beli',  nameEn: 'Old Pascas White Rum',         price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Triple sec',           nameEn: 'Triple Sec',                   price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },
    { categoryId: catMap['Žestoki alkohol'],   nameSr: 'Crni rum',             nameEn: 'Dark Rum',                     price: 0, unit: 'kom', stockQuantity: 20, normQuantity: 1 },

    // ── Ostalo / Other ────────────────────────────────────────────────────────
    { categoryId: catMap['Ostalo'],            nameSr: 'Topla čokolada C/B',   nameEn: 'Hot Chocolate W/B',            price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Ostalo'],            nameSr: 'Čajevi',               nameEn: 'Tea (various)',                price: 0, unit: 'kom', stockQuantity: 50, normQuantity: 1 },
    { categoryId: catMap['Ostalo'],            nameSr: 'Plazma',               nameEn: 'Plazma Biscuit',               price: 0, unit: 'kom', stockQuantity: 40, normQuantity: 1 },
    { categoryId: catMap['Ostalo'],            nameSr: 'Monin tropsko voće',   nameEn: 'Monin Tropical Fruit Syrup',   price: 0, unit: 'kom', stockQuantity: 10, normQuantity: 1 },
    { categoryId: catMap['Ostalo'],            nameSr: 'Monin kiwi',           nameEn: 'Monin Kiwi Syrup',             price: 0, unit: 'kom', stockQuantity: 10, normQuantity: 1 },
    { categoryId: catMap['Ostalo'],            nameSr: 'Monin breskva',        nameEn: 'Monin Peach Syrup',            price: 0, unit: 'kom', stockQuantity: 10, normQuantity: 1 },
  ]

  await prisma.product.createMany({ data: products })

  console.log(`  ✓ Kreirano ${products.length} proizvoda / Created ${products.length} products`)
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

  console.log('\n🍺 Proizvodi / Products:')
  await seedProducts()

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
