/**
 * @file scripts/build-installer.js
 * @description Automatizovani build skript koji proverava okruženje, priprema bazu
 *              i kreira Windows .exe installer za Kafic App.
 *              Automated build script that checks the environment, prepares the
 *              database, and creates the Windows .exe installer for Kafic App.
 *
 * Pokretanje / Run:
 *   node scripts/build-installer.js
 *   npm run build:installer
 *   BUILDUJ.bat  (Windows double-click)
 */

'use strict'

const { execSync }                          = require('child_process')
const { existsSync, statSync, readdirSync,
        readFileSync, unlinkSync }          = require('fs')
const { join, resolve }                     = require('path')
const readline                              = require('readline')

// ─── ANSI boje / ANSI colors ──────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  gray:   '\x1b[90m',
}

const ROOT         = resolve(__dirname, '..')
const TOTAL_STEPS  = 7

// ─── Helpers ──────────────────────────────────────────────────────────────────

function header() {
  console.log(`\n${C.bold}${C.cyan}`)
  console.log('  ╔══════════════════════════════════════════════╗')
  console.log('  ║        KAFIC APP — BUILD INSTALLER           ║')
  console.log('  ╚══════════════════════════════════════════════╝')
  console.log(C.reset)
}

function step(n, msg) {
  console.log(`\n${C.bold}${C.blue}[${n}/${TOTAL_STEPS}]${C.reset} ${C.bold}${msg}${C.reset}`)
}

function ok(msg)   { console.log(`  ${C.green}✓${C.reset}  ${msg}`) }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset}  ${msg}`) }
function info(msg) { console.log(`  ${C.gray}→${C.reset}  ${C.gray}${msg}${C.reset}`) }

function fail(msg) {
  console.log(`\n  ${C.red}${C.bold}✗  GREŠKA / ERROR:${C.reset}  ${C.red}${msg}${C.reset}`)
  console.log(`\n${C.gray}  Prekid / Aborted.${C.reset}\n`)
  process.exit(1)
}

function run(cmd, label) {
  info(`Izvršava: ${cmd}`)
  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT })
    ok(label)
  } catch {
    fail(`${label} — neuspešno.\n     Komanda: ${cmd}`)
  }
}

function tryRun(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    return null
  }
}

/** Async readline prompt — vraća unos korisnika / Returns user input */
function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Pronalazi stvarnu putanju do SQLite dev.db fajla čitanjem DATABASE_URL iz .env
 * Finds the real path to the SQLite dev.db file by reading DATABASE_URL from .env
 */
function findDbPath() {
  try {
    const envContent = readFileSync(join(ROOT, '.env'), 'utf8')
    const match = envContent.match(/DATABASE_URL\s*=\s*["']?file:([^"'\s\r\n]+)["']?/)
    if (match) {
      const filePath = match[1]
      // Pokušaj od root projekta / Try relative to project root
      const fromRoot = resolve(ROOT, filePath)
      if (existsSync(fromRoot)) return fromRoot
      // Pokušaj relativno od prisma/ foldera / Try relative to prisma/ folder
      const fromSchema = resolve(join(ROOT, 'prisma'), filePath)
      if (existsSync(fromSchema)) return fromSchema
      // Vrati od root-a kao default / Return from root as default
      return fromRoot
    }
  } catch { /* .env ne postoji / .env missing */ }

  // Hardcoded fallback
  const fallback = join(ROOT, 'prisma', 'dev.db')
  return fallback
}

// ─── Koraci / Steps ───────────────────────────────────────────────────────────

/**
 * Proverava da li skript radi sa administratorskim privilegijama (samo Windows).
 * Checks whether the script is running with administrator privileges (Windows only).
 */
function checkAdminPrivileges() {
  if (process.platform !== 'win32') return true
  try {
    execSync('net session', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function checkEnvironment() {
  step(1, 'Provera okruženja / Checking environment')

  const nodeVersion = tryRun('node -v')
  if (!nodeVersion) fail('Node.js nije pronađen. Instalirajte Node.js 18+ sa https://nodejs.org')
  const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10)
  if (major < 18) fail(`Node.js ${nodeVersion} nije podržan. Potreban je Node.js 18 ili noviji.`)
  ok(`Node.js ${nodeVersion}`)

  const npmVersion = tryRun('npm -v')
  if (!npmVersion) fail('npm nije pronađen.')
  ok(`npm v${npmVersion}`)

  const prismaCheck = tryRun('npx prisma -v')
  if (!prismaCheck) fail('Prisma nije instaliran. Pokrenite: npm install')
  ok('Prisma dostupan')

  if (process.platform !== 'win32') {
    warn(`Platforma: ${process.platform} — .exe installer se može kreirati samo na Windows-u.`)
  } else {
    ok(`Platforma: Windows ${process.arch}`)

    // electron-builder zahteva admin za kreiranje symlink-ova u winCodeSign paketu
    // electron-builder needs admin to create symlinks in the winCodeSign package
    if (!checkAdminPrivileges()) {
      console.log()
      console.log(`  ${C.red}${C.bold}✗  Nedostaju administratorska prava!${C.reset}`)
      console.log()
      console.log(`  ${C.yellow}electron-builder zahteva administratorske privilegije da bi kreirao`)
      console.log(`  simboličke linkove u winCodeSign paketu (potrebno za .exe packaging).${C.reset}`)
      console.log()
      console.log(`  ${C.bold}Rešenje — izaberite jednu od opcija:${C.reset}`)
      console.log()
      console.log(`  ${C.green}1. Koristite BUILDUJ.bat${C.reset} — automatski traži UAC elevaciju`)
      console.log(`     ${C.gray}(duplim klikom na BUILDUJ.bat → pojavljuje se UAC prozor → kliknite Da)${C.reset}`)
      console.log()
      console.log(`  ${C.green}2. Pokrenite terminal kao administrator${C.reset}`)
      console.log(`     ${C.gray}(desni klik na Command Prompt / PowerShell → Pokreni kao administrator)`)
      console.log(`     ${C.gray}zatim: node scripts/build-installer.js${C.reset}`)
      console.log()
      console.log(`  ${C.green}3. Uključite Windows Developer Mode${C.reset} (jedanput, trajno)`)
      console.log(`     ${C.gray}Podešavanja → Sistem → Za programere → Developer Mode → Uključi${C.reset}`)
      console.log()
      process.exit(1)
    }
    ok('Administratorska prava: potvrđena')
  }
}

function installDependencies() {
  step(2, 'Zavisnosti / Dependencies')

  const hasModules = existsSync(join(ROOT, 'node_modules'))
  const hasPrisma  = existsSync(join(ROOT, 'node_modules', '@prisma', 'client'))

  if (!hasModules || !hasPrisma) {
    console.log(`  ${C.yellow}node_modules nije pronađen — pokrećem npm install...${C.reset}`)
    run('npm install', 'npm install završen')
  } else {
    ok('node_modules postoji, preskačem npm install')
    info('Za force reinstalaciju obrišite node_modules/ i pokrenite ponovo')
  }
}

async function setupDatabase() {
  step(3, 'Baza podataka / Database setup')

  // Uvek regeneriši Prisma klijenta i ažuriraj šemu
  // Always regenerate Prisma client and update schema
  run('npx prisma generate', 'Prisma klijent generisan')
  run('npx prisma db push --accept-data-loss', 'Šema baze ažurirana')

  // Detektuj putanju baze / Detect database path
  const dbPath = findDbPath()
  const dbExists = existsSync(dbPath)

  if (dbExists) {
    const dbSize = statSync(dbPath).size
    console.log(`\n  ${C.yellow}Baza podataka već postoji:${C.reset}`)
    console.log(`  ${C.gray}  Putanja: ${dbPath}${C.reset}`)
    console.log(`  ${C.gray}  Veličina: ${formatBytes(dbSize)}${C.reset}`)
    console.log()

    const answer = await ask(
      `  ${C.bold}Da li želite da OBRIŠETE i ponovo popunite bazu demo podacima?${C.reset}\n` +
      `  ${C.gray}(y = da, obriši i ponovo popuni | Enter = ne, zadrži postojeće)${C.reset}\n` +
      `  Vaš odgovor [y/N]: `
    )

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'da') {
      try {
        unlinkSync(dbPath)
        ok('Stara baza obrisana')
      } catch (err) {
        fail(`Nije moguće obrisati bazu: ${err.message}`)
      }
      // Ponovo kreiraj šemu na novoj (praznoj) bazi
      // Re-create schema on the new (empty) database
      run('npx prisma db push', 'Šema kreirana na novoj bazi')
      run('npx tsx prisma/seed.ts', 'Demo podaci uneseni u novu bazu (seed)')
      ok(`Baza osvežena: ${dbPath}`)
    } else {
      ok('Baza zadržana bez izmena — seed preskočen')
      info('Bundlovana baza sadrži postojeće podatke')
    }

  } else {
    // Baza ne postoji — kreiraj sa seed podacima
    // Database doesn't exist — create with seed data
    run('npx tsx prisma/seed.ts', 'Demo podaci uneseni u novu bazu (seed)')

    // Proveri da li je baza sada kreirana / Verify database was created
    if (!existsSync(dbPath)) {
      // Potraži na alternativnim putanjama / Search alternate paths
      const alt1 = join(ROOT, 'prisma', 'dev.db')
      const alt2 = join(ROOT, 'dev.db')
      const found = [alt1, alt2].find(p => existsSync(p))
      if (!found) {
        fail(`Baza nije kreirana.\nTražena putanja: ${dbPath}\nProveri DATABASE_URL u .env fajlu.`)
      }
      warn(`Baza pronađena na alternativnoj putanji: ${found}`)
    }
  }

  // Finalni status / Final status
  const finalPath = findDbPath()
  if (existsSync(finalPath)) {
    const size = statSync(finalPath).size
    ok(`prisma/dev.db spreman (${formatBytes(size)})`)
  }
}

function buildApp() {
  step(4, 'Build aplikacije / Application build')
  info('Kompajlira TypeScript, React i Electron process-e...')
  run('npx electron-vite build', 'Build uspešan')

  if (!existsSync(join(ROOT, 'out', 'main'))) {
    fail('out/main ne postoji nakon build-a. Pogledajte greške iznad.')
  }
  ok('out/ folder kreiran')
}

function checkIcon() {
  step(5, 'Ikonica aplikacije / Application icon')

  const icoPath = join(ROOT, 'build', 'icon.ico')
  if (existsSync(icoPath)) {
    const size = statSync(icoPath).size
    ok(`build/icon.ico pronađen (${formatBytes(size)})`)
  } else {
    warn('build/icon.ico NIJE pronađen — koristiće se podrazumevana Electron ikonica.')
    info('Za sopstvenu ikonicu: kreirajte build/icon.ico (256×256 px, .ico format)')
    info('Alat za konverziju: https://www.icoconverter.com/')
  }
}

function packageInstaller() {
  step(6, 'Kreiranje .exe instalera / Creating .exe installer')

  // Proveri da .prisma postoji pre pakovanja (bez ovoga aplikacija ne može da startuje)
  // Verify .prisma exists before packaging (app cannot start without this)
  const prismaClientDir = join(ROOT, 'node_modules', '.prisma', 'client')
  if (!existsSync(prismaClientDir)) {
    fail(
      'node_modules/.prisma/client/ ne postoji!\n' +
      '     Pokrenite: npx prisma generate\n' +
      '     Zatim ponovo pokrenite build.'
    )
  }

  // Listaj šta je u .prisma/client/ da pomogne pri dijagnostici
  // List .prisma/client/ contents to aid diagnostics
  try {
    const { readdirSync: rd } = require('fs')
    const entries = rd(prismaClientDir)
    const engineFile = entries.find(f => f.includes('query') && (f.endsWith('.node') || f.endsWith('.dll.node')))
    if (engineFile) {
      ok(`Prisma query engine: ${engineFile}`)
    } else {
      warn('Query engine .node fajl nije pronađen u .prisma/client/ — možda nedostaje binaryTarget')
    }
  } catch { /* ignore */ }

  info('Ovo može potrajati 1–3 minuta...')
  run('npx electron-builder --win --x64', '.exe installer kreiran')

  // Verifikacija: potvrdi da je .prisma kopiran u win-unpacked
  // Verification: confirm .prisma was copied to win-unpacked
  const unpackedPrisma = join(ROOT, 'dist', 'win-unpacked', 'resources', 'app', 'node_modules', '.prisma')
  if (existsSync(unpackedPrisma)) {
    ok('.prisma/ verifikovan u dist/win-unpacked/resources/app/node_modules/')
  } else {
    warn('.prisma/ NIJE pronađen u win-unpacked — aplikacija možda neće startovati!')
    info('Putanja: dist/win-unpacked/resources/app/node_modules/.prisma/')
  }
}

function reportResult() {
  step(7, 'Rezultat / Result')

  const distDir = join(ROOT, 'dist')
  if (!existsSync(distDir)) {
    fail('dist/ folder ne postoji. electron-builder nije kreirao output.')
  }

  let installerPath = null
  try {
    const files = readdirSync(distDir)
    const exe = files.find(f =>
      f.endsWith('.exe') &&
      !f.toLowerCase().includes('uninstall') &&
      f.toLowerCase().includes('setup')
    )
    if (exe) installerPath = join(distDir, exe)
  } catch { /* ignore */ }

  console.log(`\n${C.bold}${C.green}`)
  console.log('  ╔══════════════════════════════════════════════╗')
  console.log('  ║          ✅  BUILD USPEŠAN! / SUCCESS!       ║')
  console.log('  ╚══════════════════════════════════════════════╝')
  console.log(C.reset)

  if (installerPath && existsSync(installerPath)) {
    const size = statSync(installerPath).size
    console.log(`  ${C.bold}Installer:${C.reset}  ${C.green}${installerPath}${C.reset}`)
    console.log(`  ${C.bold}Veličina: ${C.reset}  ${C.green}${formatBytes(size)}${C.reset}`)
  } else {
    console.log(`  ${C.bold}Output folder:${C.reset}  ${C.green}${distDir}${C.reset}`)
  }

  console.log(`\n  ${C.gray}Podrazumevani nalog / Default login:${C.reset}`)
  console.log(`  ${C.gray}  Admin:   admin / admin123${C.reset}`)
  console.log(`  ${C.gray}  Konobar: konobar / konobar123${C.reset}`)
  console.log(`\n  ${C.yellow}⚠  Promenite lozinke pri prvom pokretanju!${C.reset}\n`)

  // Otvori dist/ u Windows Exploreru
  if (process.platform === 'win32') {
    try { execSync(`explorer "${distDir}"`, { stdio: 'ignore' }) } catch { /* ignore */ }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  header()
  const startTime = Date.now()

  checkEnvironment()
  installDependencies()
  await setupDatabase()
  buildApp()
  checkIcon()
  packageInstaller()
  reportResult()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`  ${C.gray}Ukupno vreme: ${elapsed}s${C.reset}\n`)
}

main().catch(err => {
  console.error(`\n  ${C.red}Neočekivana greška: ${err.message}${C.reset}\n`)
  process.exit(1)
})
