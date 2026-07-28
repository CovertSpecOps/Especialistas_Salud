// Seed de datos de demostracion — Especialistas Salud
//
// Puebla la base con datos FICTICIOS para desarrollo (nunca datos reales de
// pacientes). Se ejecuta con: npm run db:seed
//
// Alcance MVP 1: catalogo de especialidades + un admin y un profesional demo,
// para poder ver las relaciones User<->Professional (1:1) y
// Specialty->Professional (1:N) funcionando de extremo a extremo.
//
// Idempotente: usa upsert, asi que puede ejecutarse varias veces sin duplicar.

import "dotenv/config"; // carga DATABASE_URL desde .env
import { scryptSync, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Prisma 7 conecta mediante un "driver adapter" (ya no un motor binario):
// hay que pasarle explicitamente uno. PrismaPg usa la DATABASE_URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Hash de contrasena con scrypt (integrado en Node, sin dependencias nuevas).
// NOTA: la libreria de autenticacion definitiva es una decision ABIERTA
// (docs/arquitectura.md, decision 2). Esto cumple la regla "las contrasenas se
// guardan hasheadas, jamas en texto plano". Formato: "<salt-hex>:<hash-hex>".
function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // 1) Catalogo de especialidades (dato configurable, no comportamiento).
  const especialidades = [
    { nombre: "Fisioterapia", descripcion: "Rehabilitacion fisica y del movimiento." },
    { nombre: "Nutricion", descripcion: "Alimentacion y planes nutricionales." },
    { nombre: "Odontologia", descripcion: "Salud bucodental." },
    { nombre: "Medicina general", descripcion: "Atencion medica de primer contacto." },
    { nombre: "Psicologia", descripcion: "Salud mental y acompanamiento psicologico." },
  ];

  for (const esp of especialidades) {
    await prisma.specialty.upsert({
      where: { nombre: esp.nombre }, // nombre es unico: sirve de clave natural
      update: {}, // si ya existe, no tocamos nada
      create: esp,
    });
  }

  // 2) Usuario ADMIN de demo (sin perfil: un admin puede no atender pacientes).
  await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      passwordHash: hashPassword("demo1234"),
      role: "ADMIN",
    },
  });

  // 3) Usuario PROFESSIONAL de demo + su perfil, ligado a una especialidad.
  const fisioterapia = await prisma.specialty.findUniqueOrThrow({
    where: { nombre: "Fisioterapia" },
  });

  await prisma.user.upsert({
    where: { email: "profesional@demo.local" },
    update: {},
    create: {
      email: "profesional@demo.local",
      passwordHash: hashPassword("demo1234"),
      role: "PROFESSIONAL",
      // Relacion anidada: crea el Professional junto con el User (1:1).
      professional: {
        create: {
          nombre: "Ana",
          apellidos: "Rodriguez Mora",
          correoContacto: "ana.rodriguez@demo.local",
          telefono: "+506 8888 0000",
          specialtyId: fisioterapia.id,
        },
      },
    },
  });

  console.log("Seed completado: especialidades + admin y profesional demo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
