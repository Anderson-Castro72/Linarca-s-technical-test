import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/app/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // Retornamos solo lo necesario
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error: any) {
    console.error("❌ Error en /api/register:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
