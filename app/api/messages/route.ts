import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, content } = await req.json();

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // --- Buscar o crear conversación ---
    let conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      // ⚠️ Cambia este userId por uno válido que exista en tu tabla User
      const user = await prisma.user.findFirst();
      if (!user) {
        return NextResponse.json({ error: 'No existe ningún usuario registrado.' }, { status: 400 });
      }

      conversation = await prisma.conversation.create({
        data: {
          id: conversationId || uuidv4(),
          userId: user.id,
        },
      });
    }

    // --- Guardar mensaje del usuario ---
    const userMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content,
      },
    });

    // --- Recuperar historial de conversación ---
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    // --- Preparar contexto para el modelo ---
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // --- Llamar a Gemini ---
    const result = await model.generateContent({
      contents: [...chatHistory, { role: 'user', parts: [{ text: content }] }],
    });

    const reply = result.response.text();

    // --- Guardar respuesta de la IA ---
    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: reply,
        status: 'completed',
      },
    });

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('❌ Error en /api/messages:', error);
    return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 });
  }
}
