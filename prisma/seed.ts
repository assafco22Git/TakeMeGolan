import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const golanHash = await bcrypt.hash(process.env.GOLAN_PASSWORD || "golan123", 12);
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 12);

  await prisma.user.upsert({
    where: { username: "golan" },
    update: { passwordHash: golanHash },
    create: {
      username: "golan",
      passwordHash: golanHash,
      role: Role.OWNER,
    },
  });

  await prisma.user.upsert({
    where: { username: "me" },
    update: { passwordHash: adminHash },
    create: {
      username: "me",
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });

  console.log("Seeded 2 users: golan (OWNER) and me (ADMIN)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
