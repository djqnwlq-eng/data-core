import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

// 자주 검색하는 질문 + 데이터 분석 기반 추천 조회
export async function GET() {
  // 1. 검색 기록 기반 인기 검색어 (최근 30일)
  const { data: searchLogs } = await supabase
    .from('search_logs')
    .select('query')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  // 검색어별 횟수 집계
  const searchCounts: Record<string, number> = {};
  if (searchLogs) {
    for (const log of searchLogs) {
      const q = log.query.trim();
      if (q) searchCounts[q] = (searchCounts[q] || 0) + 1;
    }
  }
  const popularSearches = Object.entries(searchCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([query, count]) => ({ query, count, source: 'search_log' as const }));

  // 2. 데이터 분석 기반 추천 주제
  const { data: topics } = await supabase
    .from('popular_topics')
    .select('*')
    .eq('source', 'data_analysis')
    .order('count', { ascending: false })
    .limit(8);

  return NextResponse.json({
    popularSearches,
    recommendedTopics: topics || [],
  });
}

// 검색 기록 저장
export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
  }

  await supabase.from('search_logs').insert({ query: query.trim() });

  return NextResponse.json({ success: true });
}
