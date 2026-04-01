import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  const envStatus = {
    SUPABASE_URL: supabaseUrl ? `설정됨 (${supabaseUrl.slice(0, 20)}...)` : '미설정',
    SUPABASE_KEY: supabaseKey ? `설정됨 (${supabaseKey.slice(0, 20)}...)` : '미설정',
    GEMINI_KEY: geminiKey ? `설정됨 (${geminiKey.slice(0, 10)}...)` : '미설정',
  };

  // Supabase 연결 테스트
  let dbStatus = '미확인';
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const client = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await client.from('categories').select('name').limit(1);
      if (error) {
        dbStatus = `에러: ${error.message}`;
      } else {
        dbStatus = `정상 (카테고리: ${data?.[0]?.name || 'N/A'})`;
      }
    } catch (e) {
      dbStatus = `연결 실패: ${e}`;
    }
  }

  return NextResponse.json({ envStatus, dbStatus });
}
