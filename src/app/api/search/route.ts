import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateEmbedding, generateAnswer } from '@/lib/gemini';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
  }

  // 검색 기록 저장 (비동기)
  supabase.from('search_logs').insert({ query }).then(() => {});

  const chatResults: {
    id: string;
    title: string;
    content: string;
    sender: string;
    room_name: string;
    similarity?: number;
    created_at?: string;
  }[] = [];

  const knowledgeResults: {
    id: string;
    title: string;
    content: string;
    category: string;
    source_type: string;
    similarity?: number;
    created_at?: string;
  }[] = [];

  // 1. 키워드 검색 - 채팅
  const { data: chatKeyword } = await supabase
    .from('chat_messages')
    .select('*')
    .ilike('message', `%${query}%`)
    .order('chat_date', { ascending: false })
    .limit(15);

  if (chatKeyword) {
    for (const item of chatKeyword) {
      chatResults.push({
        id: item.id,
        title: `${item.sender}`,
        content: item.message,
        sender: item.sender,
        room_name: item.room_name,
        created_at: item.chat_date || item.created_at,
      });
    }
  }

  // 2. 키워드 검색 - 지식(대본)
  const { data: knowledgeKeyword } = await supabase
    .from('knowledge')
    .select('*')
    .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (knowledgeKeyword) {
    for (const item of knowledgeKeyword) {
      knowledgeResults.push({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        source_type: item.source_type,
        created_at: item.created_at,
      });
    }
  }

  // 3. AI 의미 검색
  try {
    const queryEmbedding = await generateEmbedding(query);
    const { data: semanticResults } = await supabase.rpc('match_embeddings', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.4,
      match_count: 15,
    });

    if (semanticResults) {
      for (const item of semanticResults) {
        if (item.source_table === 'knowledge') {
          if (!knowledgeResults.some(r => r.id === item.source_id)) {
            const { data: original } = await supabase
              .from('knowledge')
              .select('*')
              .eq('id', item.source_id)
              .single();
            if (original) {
              knowledgeResults.push({
                id: original.id,
                title: original.title,
                content: original.content,
                category: original.category,
                source_type: original.source_type,
                similarity: item.similarity,
                created_at: original.created_at,
              });
            }
          }
        } else if (item.source_table === 'chat_messages') {
          if (!chatResults.some(r => r.id === item.source_id)) {
            const { data: original } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('id', item.source_id)
              .single();
            if (original) {
              chatResults.push({
                id: original.id,
                title: `${original.sender}`,
                content: original.message,
                sender: original.sender,
                room_name: original.room_name,
                similarity: item.similarity,
                created_at: original.chat_date || original.created_at,
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('의미 검색 실패:', error);
  }

  // 4. AI 추천 답변 생성
  let aiAnswer: string | null = null;
  const allContent = [
    ...knowledgeResults.slice(0, 2).map(r => r.content.slice(0, 500)),
    ...chatResults.slice(0, 3).map(r => `${r.sender}: ${r.content.slice(0, 300)}`),
  ];

  if (allContent.length > 0) {
    try {
      aiAnswer = await generateAnswer(query, allContent);
    } catch (error) {
      console.error('AI 답변 생성 실패:', error);
    }
  }

  return NextResponse.json({
    chatResults: chatResults.slice(0, 10),
    knowledgeResults: knowledgeResults.slice(0, 10),
    aiAnswer,
  });
}
