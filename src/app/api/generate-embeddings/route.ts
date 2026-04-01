import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateEmbedding, splitIntoChunks } from '@/lib/gemini';

// 아직 임베딩이 없는 데이터에 대해 임베딩 생성 (배치)
export async function POST() {
  // 1. 임베딩이 없는 채팅 메시지 찾기
  const { data: allEmbeddings } = await supabase
    .from('embeddings')
    .select('source_id')
    .eq('source_table', 'chat_messages');

  const embeddedIds = new Set(allEmbeddings?.map(e => e.source_id) || []);

  const { data: chatMessages } = await supabase
    .from('chat_messages')
    .select('id, sender, message, room_name')
    .order('created_at', { ascending: true })
    .limit(500);

  if (!chatMessages || chatMessages.length === 0) {
    return NextResponse.json({ message: '처리할 메시지가 없습니다.', processed: 0 });
  }

  // 임베딩 안 된 메시지만 필터
  const unprocessed = chatMessages.filter(m => !embeddedIds.has(m.id));

  if (unprocessed.length === 0) {
    return NextResponse.json({ message: '모든 메시지가 이미 처리되었습니다.', processed: 0 });
  }

  // 10개씩 묶어서 임베딩 생성
  let processed = 0;
  const chunkSize = 10;
  const maxBatch = 20; // 한 번에 최대 20그룹 (200메시지)

  for (let i = 0; i < Math.min(unprocessed.length, maxBatch * chunkSize); i += chunkSize) {
    const group = unprocessed.slice(i, i + chunkSize);
    const groupText = group.map(m => `${m.sender}: ${m.message}`).join('\n');

    try {
      const chunks = splitIntoChunks(groupText, 800);
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        await supabase.from('embeddings').insert({
          source_table: 'chat_messages',
          source_id: group[0].id,
          chunk_text: chunk,
          embedding: JSON.stringify(embedding),
        });
      }
      processed += group.length;
    } catch (error) {
      console.error('임베딩 생성 실패:', error);
      break; // API 제한에 걸리면 중단
    }
  }

  const remaining = unprocessed.length - processed;

  return NextResponse.json({
    processed,
    remaining,
    message: remaining > 0
      ? `${processed}건 처리 완료. ${remaining}건 남음.`
      : `${processed}건 처리 완료!`,
  });
}
