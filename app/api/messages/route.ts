import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const prismaClient = new PrismaClient();

// --- GET: obtener mensajes de una conversación ---
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prismaClient.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ error: "Falta conversationId" }, { status: 400 });

    const messages = await prismaClient.message.findMany({
      where: { conversationId, conversation: { userId: user.id } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("❌ Error en GET /api/messages:", error);
    return NextResponse.json({ error: "Error interno en el servidor" }, { status: 500 });
  }
}

// --- POST: enviar mensaje a Gemini ---
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { conversationId, content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });

    const user = await prismaClient.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 });

    let conversation;
    if (conversationId) {
      conversation = await prismaClient.conversation.findFirst({
        where: { id: conversationId, userId: user.id },

      });
    }
    if (!conversation) {
      conversation = await prismaClient.conversation.create({ 
        data: { 
          userId: user.id,
          title: content.length > 50 ? content.slice(0, 25) + "..." : content

       } });
    }

    await prismaClient.message.create({
      data: { conversationId: conversation.id, role: 'user', content, status: 'completed' },
    });

    const history = await prismaClient.message.findMany({
      where: { conversationId: conversation.id, conversation: { userId: user.id } },
      orderBy: { createdAt: 'asc' },
    });

    const chatHistory = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] }));

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent({ contents: [...chatHistory, { role: 'user', parts: [{ text: content }] }] });

    const reply = result.response.text();

    const assistantMessage = await prismaClient.message.create({
      data: { conversationId: conversation.id, role: 'assistant', content: reply, status: 'completed' },
    });

    return NextResponse.json({ message: assistantMessage, conversationId: conversation.id });

  } catch (error: any) {
    console.error('❌ Error en /api/messages:', error);
    return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 });
  }
}
