import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateManual, generateEmbedding } from '@/lib/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// 매뉴얼 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from('manuals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// 매뉴얼 생성 (수동 또는 자동)
export async function POST(request: NextRequest) {
  const { topic, category, autoGenerate } = await request.json();

  // 자동 생성: 모든 카테고리에 대해 매뉴얼 생성
  if (autoGenerate) {
    return autoGenerateManuals();
  }

  if (!topic) {
    return NextResponse.json({ error: '주제가 필요합니다.' }, { status: 400 });
  }

  // 수동 생성
  const relatedContent = await getRelatedContent(topic);

  if (relatedContent.length === 0) {
    return NextResponse.json(
      { error: '관련 데이터가 없습니다. 먼저 데이터를 등록해주세요.' },
      { status: 400 }
    );
  }

  try {
    const content = await generateManual(topic, relatedContent);

    // 기존 같은 주제 매뉴얼이 있으면 업데이트
    const { data: existing } = await supabase
      .from('manuals')
      .select('id')
      .ilike('title', `%${topic}%`)
      .limit(1)
      .single();

    let data;
    if (existing) {
      const { data: updated } = await supabase
        .from('manuals')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      data = updated;
    } else {
      const { data: created } = await supabase
        .from('manuals')
        .insert({
          title: `${topic} CS 매뉴얼`,
          content,
          category: category || '일반',
        })
        .select()
        .single();
      data = created;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('매뉴얼 생성 실패:', error);
    return NextResponse.json({ error: '매뉴얼 생성에 실패했습니다.' }, { status: 500 });
  }
}

async function getRelatedContent(topic: string): Promise<string[]> {
  const relatedContent: string[] = [];

  // 의미 검색
  try {
    const queryEmbedding = await generateEmbedding(topic);
    const { data: matches } = await supabase.rpc('match_embeddings', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 20,
    });
    if (matches) {
      relatedContent.push(...matches.map((m: { chunk_text: string }) => m.chunk_text));
    }
  } catch {
    // ignore
  }

  // 키워드 검색 보완
  const { data: knowledgeResults } = await supabase
    .from('knowledge')
    .select('content')
    .ilike('content', `%${topic}%`)
    .limit(10);
  if (knowledgeResults) {
    relatedContent.push(...knowledgeResults.map(r => r.content));
  }

  const { data: chatResults } = await supabase
    .from('chat_messages')
    .select('sender, message')
    .ilike('message', `%${topic}%`)
    .limit(20);
  if (chatResults) {
    relatedContent.push(...chatResults.map(r => `${r.sender}: ${r.message}`));
  }

  return relatedContent;
}

async function autoGenerateManuals() {
  // 1. AI로 주요 카테고리 추출
  const { data: chatSamples } = await supabase
    .from('chat_messages')
    .select('message, sender')
    .order('created_at', { ascending: false })
    .limit(300);

  const { data: knowledgeSamples } = await supabase
    .from('knowledge')
    .select('title, content')
    .limit(30);

  if ((!chatSamples || chatSamples.length === 0) && (!knowledgeSamples || knowledgeSamples.length === 0)) {
    return NextResponse.json({ error: '매뉴얼을 생성할 데이터가 없습니다.' }, { status: 400 });
  }

  const sampleText = [
    ...(chatSamples?.slice(0, 150).map(m => `${m.sender}: ${m.message}`) || []),
    ...(knowledgeSamples?.map(k => `[대본] ${k.title}: ${k.content.slice(0, 200)}`) || []),
  ].join('\n');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `아래는 화장품 창업 교육의 채팅 기록과 강의 대본입니다.
이 데이터에서 CS 매뉴얼로 만들어야 할 핵심 카테고리 5~8개를 추출해주세요.

데이터:
${sampleText}

JSON으로만 응답: ["카테고리1", "카테고리2", ...]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    const categories: string[] = JSON.parse(jsonMatch[0]);
    const generatedManuals = [];

    for (const cat of categories.slice(0, 8)) {
      const relatedContent = await getRelatedContent(cat);
      if (relatedContent.length === 0) continue;

      try {
        const content = await generateManual(cat, relatedContent);

        // 기존 매뉴얼 업데이트 또는 새로 생성
        const { data: existing } = await supabase
          .from('manuals')
          .select('id')
          .ilike('title', `%${cat}%`)
          .limit(1)
          .single();

        if (existing) {
          await supabase
            .from('manuals')
            .update({ content, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('manuals')
            .insert({ title: `${cat} CS 매뉴얼`, content, category: cat });
        }

        generatedManuals.push(cat);
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      generated: generatedManuals,
    });
  } catch (error) {
    console.error('자동 매뉴얼 생성 실패:', error);
    return NextResponse.json({ error: '매뉴얼 자동 생성에 실패했습니다.' }, { status: 500 });
  }
}
