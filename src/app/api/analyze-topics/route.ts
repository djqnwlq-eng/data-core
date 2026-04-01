import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 업로드된 데이터를 분석하여 자주 묻는 주제 추출
export async function POST() {
  // 최근 채팅 메시지에서 샘플 추출
  const { data: chatSamples } = await supabase
    .from('chat_messages')
    .select('message, sender')
    .order('created_at', { ascending: false })
    .limit(200);

  // 강의 대본(지식) 제목들
  const { data: knowledgeTitles } = await supabase
    .from('knowledge')
    .select('title, category')
    .order('created_at', { ascending: false })
    .limit(50);

  if ((!chatSamples || chatSamples.length === 0) && (!knowledgeTitles || knowledgeTitles.length === 0)) {
    return NextResponse.json({ error: '분석할 데이터가 없습니다.' }, { status: 400 });
  }

  const chatText = chatSamples
    ?.filter(m => m.message.length > 10)
    .slice(0, 100)
    .map(m => `${m.sender}: ${m.message}`)
    .join('\n') || '';

  const knowledgeText = knowledgeTitles
    ?.map(k => `[${k.category}] ${k.title}`)
    .join('\n') || '';

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `아래는 화장품 창업 교육 사업의 교육생-코치 간 카카오톡 대화와 강의 대본 목록입니다.

대화 내용:
${chatText}

강의 대본 목록:
${knowledgeText}

위 데이터를 분석하여 교육생들이 가장 자주 질문하거나 관심을 가지는 주제 TOP 10을 추출해주세요.
각 주제는 짧고 명확한 키워드 형태로 작성해주세요 (2~4글자).

JSON 형식으로만 응답해주세요:
[{"topic": "주제명", "count": 예상빈도수}]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // JSON 파싱
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    const topics: { topic: string; count: number }[] = JSON.parse(jsonMatch[0]);

    // 기존 데이터 분석 주제 삭제 후 새로 저장
    await supabase.from('popular_topics').delete().eq('source', 'data_analysis');

    for (const t of topics) {
      await supabase.from('popular_topics').insert({
        topic: t.topic,
        source: 'data_analysis',
        count: t.count,
      });
    }

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('주제 분석 실패:', error);
    return NextResponse.json({ error: '주제 분석에 실패했습니다.' }, { status: 500 });
  }
}
