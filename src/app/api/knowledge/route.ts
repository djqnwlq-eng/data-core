import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateEmbedding, splitIntoChunks } from '@/lib/gemini';

// 지식 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('knowledge')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== '전체') {
    query = query.eq('category', category);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, total: count, page, limit });
}

// 지식 등록 (직접 입력)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content, category, tags, sourceType } = body;

  if (!title || !content) {
    return NextResponse.json(
      { error: '제목과 내용은 필수입니다.' },
      { status: 400 }
    );
  }

  // 1. 지식 저장
  const { data, error } = await supabase
    .from('knowledge')
    .insert({
      title,
      content,
      category: category || '일반',
      source_type: sourceType || 'direct',
      tags: tags || [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. 임베딩 생성 (비동기로 처리)
  try {
    const fullText = `${title}\n${content}`;
    const chunks = splitIntoChunks(fullText);

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk);
      await supabase.from('embeddings').insert({
        source_table: 'knowledge',
        source_id: data.id,
        chunk_text: chunk,
        embedding: JSON.stringify(embedding),
      });
    }
  } catch (embeddingError) {
    console.error('임베딩 생성 실패:', embeddingError);
    // 임베딩 실패해도 지식은 저장됨
  }

  return NextResponse.json({ data }, { status: 201 });
}

// 지식 삭제
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다.' }, { status: 400 });
  }

  // 임베딩도 함께 삭제
  await supabase
    .from('embeddings')
    .delete()
    .eq('source_table', 'knowledge')
    .eq('source_id', id);

  const { error } = await supabase.from('knowledge').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
