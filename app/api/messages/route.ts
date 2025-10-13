import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const prismaClient = new PrismaClient();

// --- Configuración inline de NextAuth ---
const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prismaClient.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user?.password) throw new Error("Invalid credentials");
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" as const },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function POST(req: NextRequest) {
  try {
    // --- Obtener sesión ---
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { conversationId, content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });

    const user = await prismaClient.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });

    // --- Buscar o crear conversación ---
    let conversation = await prismaClient.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      conversation = await prismaClient.conversation.create({
        data: { id: conversationId || uuidv4(), userId: user.id },
      });
    }

    // --- Guardar mensaje del usuario ---
    await prismaClient.message.create({
      data: { conversationId: conversation.id, role: 'user', content, status: 'completed' },
    });

    // --- Recuperar historial ---
    const history = await prismaClient.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // --- Llamar a Gemini ---
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({
      contents: [...chatHistory, { role: 'user', parts: [{ text: content }] }],
    });

    const reply = result.response.text();

    // --- Guardar respuesta de la IA ---
    const assistantMessage = await prismaClient.message.create({
      data: { conversationId: conversation.id, role: 'assistant', content: reply, status: 'completed' },
    });

    return NextResponse.json({ message: assistantMessage });

  } catch (error: any) {
    console.error('❌ Error en /api/messages:', error);
    return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 });
  }
}
