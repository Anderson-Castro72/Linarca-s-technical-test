import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { v4 as uuid } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { userEmail, content } = await req.json();

    if (!content || !userEmail) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Crear usuario demo si no existe
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail, name: 'Usuario Demo' },
    });

    // Crear conversación si no existe para este usuario
    let conversation = await prisma.conversation.findFirst({
      where: { userId: user.id },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          id: uuid(),
          userId: user.id,
          title: 'Chat del usuario',
        },
      });
    }

    // Crear mensaje
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content,
        status: 'pending',
      },
    });

    return NextResponse.json({ message, conversationId: conversation.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message || 'Error interno' }, { status: 500 });
  }
}
