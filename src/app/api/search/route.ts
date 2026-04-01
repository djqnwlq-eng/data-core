import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateEmbedding, generateAnswer } from '@/lib/gemini';

// 검색어를 핵심 키워드로 분리
function extractKeywords(query: string): string[] {
  const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '에서', '으로', '로', '와', '과', '도', '만', '까지', '부터', '하나요', '할까요', '될까요', '인가요', '해야', '하면', '해서', '하고', '있나요', '없나요', '어떻게', '무엇', '어디', '언제'];

  const words = query
    .replace(/[?!.,~]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .filter(w => !stopWords.includes(w));

  return [...new Set([query, ...words])];
}

interface QAPair {
  id: string;
  question: { sender: string; message: string; date: string };
  answers: { sender: string; message: string; date: string }[];
  room_name: string;
}

// 매칭된 메시지의 앞뒤 대화를 가져와서 Q&A 쌍으로 만듦
async function getConversationContext(matchedMsg: {
  id: string; sender: string; message: string; room_name: string; chat_date: string | null; created_at: string;
}): Promise<QAPair | null> {
  const msgDate = matchedMsg.chat_date || matchedMsg.created_at;
  if (!msgDate) return null;

  // 해당 메시지 전후 5분 이내 같은 채팅방 메시지 가져오기
  const date = new Date(msgDate);
  const before = new Date(date.getTime() - 5 * 60 * 1000).toISOString();
  const after = new Date(date.getTime() + 30 * 60 * 1000).toISOString();

  const { data: nearby } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_name', matchedMsg.room_name)
    .gte('chat_date', before)
    .lte('chat_date', after)
    .order('chat_date', { ascending: true })
    .limit(10);

  if (!nearby || nearby.length === 0) return null;

  // 매칭된 메시지를 질문으로, 다른 사람의 답변을 찾기
  const questionSender = matchedMsg.sender;
  const answers = nearby
    .filter(m => m.sender !== questionSender && m.message.length > 5)
    .slice(0, 3)
    .map(m => ({
      sender: m.sender,
      message: m.message,
      date: m.chat_date || m.created_at,
    }));

  // 답변이 없으면 매칭된 메시지가 답변일 수도 있음 - 앞의 질문을 찾기
  if (answers.length === 0) {
    const questionMsgs = nearby
      .filter(m => m.sender !== questionSender && m.message.includes('?'))
      .slice(0, 1);

    if (questionMsgs.length > 0) {
      return {
        id: matchedMsg.id,
        question: {
          sender: questionMsgs[0].sender,
          message: questionMsgs[0].message,
          date: questionMsgs[0].chat_date || questionMsgs[0].created_at,
        },
        answers: [{
          sender: matchedMsg.sender,
          message: matchedMsg.message,
          date: msgDate,
        }],
        room_name: matchedMsg.room_name,
      };
    }
  }

  return {
    id: matchedMsg.id,
    question: {
      sender: matchedMsg.sender,
      message: matchedMsg.message,
      date: msgDate,
    },
    answers,
    room_name: matchedMsg.room_name,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
  }

  // 검색 기록 저장
  supabase.from('search_logs').insert({ query }).then(() => {});

  const keywords = extractKeywords(query);
  const qaPairs: QAPair[] = [];
  const addedChatIds = new Set<string>();

  const knowledgeResults: {
    id: string; title: string; content: string;
    category: string; source_type: string; similarity?: number; created_at?: string;
  }[] = [];
  const addedKnowledgeIds = new Set<string>();

  // 1. 키워드별 검색 - 채팅 → Q&A 쌍으로 변환
  for (const keyword of keywords) {
    if (qaPairs.length >= 5) break;

    const { data: chatKeyword } = await supabase
      .from('chat_messages')
      .select('*')
      .ilike('message', `%${keyword}%`)
      .order('chat_date', { ascending: false })
      .limit(5);

    if (chatKeyword) {
      for (const item of chatKeyword) {
        if (addedChatIds.has(item.id) || qaPairs.length >= 5) continue;
        addedChatIds.add(item.id);

        const qa = await getConversationContext(item);
        if (qa) {
          qaPairs.push(qa);
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
      match_count: 10,
    });

    if (semanticResults) {
      for (const item of semanticResults) {
        if (item.source_table === 'knowledge' && !addedKnowledgeIds.has(item.source_id)) {
          const { data: original } = await supabase.from('knowledge').select('*').eq('id', item.source_id).single();
          if (original) {
            addedKnowledgeIds.add(original.id);
            knowledgeResults.push({
              id: original.id, title: original.title, content: original.content,
              category: original.category, source_type: original.source_type,
              similarity: item.similarity, created_at: original.created_at,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('의미 검색 실패:', error);
  }

  // 4. 커스텀 답변 검색
  let customAnswer: { id: string; question: string; answer: string; source: string } | null = null;
  for (const keyword of keywords.slice(0, 3)) {
    if (customAnswer) break;
    const { data: customs } = await supabase
      .from('custom_answers')
      .select('*')
      .or(`question.ilike.%${keyword}%,keywords.cs.{${keyword}}`)
      .limit(1);

    if (customs && customs.length > 0) {
      customAnswer = {
        id: customs[0].id, question: customs[0].question,
        answer: customs[0].answer, source: customs[0].source,
      };
    }
  }

  // 5. AI 추천 답변 생성 (커스텀 답변이 없을 때만)
  let aiAnswer: string | null = null;
  if (!customAnswer) {
    const allContent = [
      ...knowledgeResults.slice(0, 2).map(r => r.content.slice(0, 500)),
      ...qaPairs.slice(0, 2).map(qa =>
        `질문(${qa.question.sender}): ${qa.question.message}\n답변: ${qa.answers.map(a => `${a.sender}: ${a.message}`).join('\n')}`
      ),
    ];

    if (allContent.length > 0) {
      try {
        aiAnswer = await generateAnswer(query, allContent);
      } catch (error) {
        console.error('AI 답변 생성 실패:', error);
      }
    }
  }

  return NextResponse.json({
    qaPairs: qaPairs.slice(0, 3),
    knowledgeResults: knowledgeResults.slice(0, 10),
    customAnswer,
    aiAnswer,
  });
}
