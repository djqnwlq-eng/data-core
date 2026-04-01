import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateEmbedding, generateAnswer } from '@/lib/gemini';

// 검색어를 핵심 키워드로 분리
function extractKeywords(query: string): string[] {
  // 조사, 어미 등 불용어 제거
  const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '으로', '로', '와', '과', '도', '만', '까지', '부터', '하나요', '할까요', '될까요', '인가요', '해야', '하면', '해서', '하고', '있나요', '없나요', '어떻게', '무엇', '어디', '언제'];

  const words = query
    .replace(/[?!.,~]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .filter(w => !stopWords.includes(w));

  // 원본 쿼리도 포함 (완전 일치용)
  return [...new Set([query, ...words])];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
  }

  // 검색 기록 저장 (비동기)
  supabase.from('search_logs').insert({ query }).then(() => {});

  const keywords = extractKeywords(query);

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

  const addedChatIds = new Set<string>();
  const addedKnowledgeIds = new Set<string>();

  // 1. 키워드별 검색 - 채팅
  for (const keyword of keywords) {
    const { data: chatKeyword } = await supabase
      .from('chat_messages')
      .select('*')
      .ilike('message', `%${keyword}%`)
      .order('chat_date', { ascending: false })
      .limit(10);

    if (chatKeyword) {
      for (const item of chatKeyword) {
        if (!addedChatIds.has(item.id)) {
          addedChatIds.add(item.id);
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
    }
  }

  // 2. 키워드별 검색 - 지식(대본)
  for (const keyword of keywords) {
    const { data: knowledgeKeyword } = await supabase
      .from('knowledge')
      .select('*')
      .or(`title.ilike.%${keyword}%,content.ilike.%${keyword}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (knowledgeKeyword) {
      for (const item of knowledgeKeyword) {
        if (!addedKnowledgeIds.has(item.id)) {
          addedKnowledgeIds.add(item.id);
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
          if (!addedKnowledgeIds.has(item.source_id)) {
            const { data: original } = await supabase
              .from('knowledge')
              .select('*')
              .eq('id', item.source_id)
              .single();
            if (original) {
              addedKnowledgeIds.add(original.id);
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
          if (!addedChatIds.has(item.source_id)) {
            const { data: original } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('id', item.source_id)
              .single();
            if (original) {
              addedChatIds.add(original.id);
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
    chatResults: chatResults.slice(0, 15),
    knowledgeResults: knowledgeResults.slice(0, 10),
    aiAnswer,
  });
}
