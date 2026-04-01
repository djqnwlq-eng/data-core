import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

// 커스텀 답변 목록 조회
export async function GET() {
  const { data, error } = await supabase
    .from('custom_answers')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// 커스텀 답변 등록 (직접 등록 또는 AI 답변 수정 저장)
export async function POST(request: NextRequest) {
  const { question, answer, source } = await request.json();

  if (!question || !answer) {
    return NextResponse.json({ error: '질문과 답변 모두 필요합니다.' }, { status: 400 });
  }

  // 키워드 자동 추출
  const stopWords = ['은', '는', '이', '가', '을', '를', '의', '에', '으로', '로', '해야', '하면', '하나요', '될까요', '인가요', '어떻게'];
  const keywords = question
    .replace(/[?!.,~]/g, '')
    .split(/\s+/)
    .filter((w: string) => w.length >= 2)
    .filter((w: string) => !stopWords.includes(w));

  // 기존에 유사한 질문이 있으면 업데이트
  const { data: existing } = await supabase
    .from('custom_answers')
    .select('id')
    .ilike('question', `%${keywords[0] || question}%`)
    .limit(1)
    .single();

  if (existing) {
    const { data, error } = await supabase
      .from('custom_answers')
      .update({ question, answer, keywords, source: source || 'direct' })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, updated: true });
  }

  const { data, error } = await supabase
    .from('custom_answers')
    .insert({ question, answer, keywords, source: source || 'direct' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

// 커스텀 답변 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabase.from('custom_answers').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
