import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { parseKakaoChat } from '@/lib/kakao-parser';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
  }

  const results: {
    fileName: string;
    roomName: string;
    totalMessages: number;
    savedCount: number;
    error?: string;
  }[] = [];

  for (const file of files) {
    let text: string;
    try {
      text = await file.text();
    } catch {
      results.push({
        fileName: file.name,
        roomName: '',
        totalMessages: 0,
        savedCount: 0,
        error: '파일을 읽을 수 없습니다.',
      });
      continue;
    }

    const { roomName, messages } = parseKakaoChat(text, file.name);

    if (messages.length === 0) {
      results.push({
        fileName: file.name,
        roomName,
        totalMessages: 0,
        savedCount: 0,
        error: '파싱된 메시지가 없습니다.',
      });
      continue;
    }

    // 빠른 저장 (임베딩 없이 메시지만 저장)
    const batchSize = 100;
    let savedCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize).map((msg) => ({
        room_name: roomName,
        sender: msg.sender,
        message: msg.message,
        chat_date: msg.chatDate?.toISOString() || null,
      }));

      const { error } = await supabase.from('chat_messages').insert(batch);

      if (error) {
        console.error('채팅 저장 오류:', error);
        continue;
      }
      savedCount += batch.length;
    }

    results.push({
      fileName: file.name,
      roomName,
      totalMessages: messages.length,
      savedCount,
    });
  }

  // 업로드 완료 후 주제 분석 자동 실행 (백그라운드)
  fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'http://localhost:3001' : ''}/api/analyze-topics`, {
    method: 'POST',
  }).catch(() => {});

  const totalSaved = results.reduce((sum, r) => sum + r.savedCount, 0);
  const totalMessages = results.reduce((sum, r) => sum + r.totalMessages, 0);

  return NextResponse.json({
    success: true,
    fileCount: files.length,
    totalMessages,
    totalSaved: totalSaved,
    results,
  });
}
