import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function GET() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const { name, description } = await request.json();

  if (!name) {
    return NextResponse.json(
      { error: '카테고리 이름이 필요합니다.' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
