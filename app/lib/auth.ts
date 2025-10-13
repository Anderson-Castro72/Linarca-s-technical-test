import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function verifyUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.password) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.password);

  return valid ? user : null;
}


export async function createUser(email: string, password: string, name?: string) {
  const hashed = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: { email, password: hashed, name },
  });
}
