import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';
import { generateEmbedding, splitIntoChunks } from '@/lib/gemini';

// 파일 업로드로 지식 등록
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const title = formData.get('title') as string;
  const category = formData.get('category') as string;
  const tags = formData.get('tags') as string;

  if (!file) {
    return NextResponse.json(
      { error: '파일이 필요합니다.' },
      { status: 400 }
    );
  }

  // 텍스트 파일 읽기
  let content: string;
  try {
    content = await file.text();
  } catch {
    return NextResponse.json(
      { error: '파일을 읽을 수 없습니다. 텍스트 파일만 지원합니다.' },
      { status: 400 }
    );
  }

  const finalTitle = title || file.name.replace(/\.[^/.]+$/, '');

  // 1. 지식 저장
  const { data, error } = await supabase
    .from('knowledge')
    .insert({
      title: finalTitle,
      content,
      category: category || '일반',
      source_type: 'file',
      file_name: file.name,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 2. 임베딩 생성
  try {
    const fullText = `${finalTitle}\n${content}`;
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
  }

  return NextResponse.json({ data }, { status: 201 });
}
