'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Link from 'next/link';
import {
  Search,
  Loader2,
  BookOpen,
  MessageSquare,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  similarity?: number;
  category?: string;
  created_at?: string;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted">로딩 중...</div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<'hybrid' | 'keyword' | 'semantic'>(
    'hybrid'
  );
  const [includeAnswer, setIncludeAnswer] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      handleSearch();
    }
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    setAiAnswer(null);

    try {
      const params = new URLSearchParams({
        q: query,
        mode,
        answer: String(includeAnswer),
      });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();

      setResults(data.results || []);
      setAiAnswer(data.aiAnswer || null);
    } catch {
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function highlightText(text: string, maxLength = 200) {
    const truncated =
      text.length > maxLength ? text.slice(0, maxLength) + '...' : text;

    if (!query) return truncated;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = truncated.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <div>
      <PageHeader
        title="검색"
        description="키워드 검색과 AI 의미 검색으로 필요한 정보를 찾으세요."
      />

      {/* 검색 폼 */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="검색어를 입력하세요... (예: 환불 방법, 수강 변경 절차)"
              className="w-full pl-12 pr-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            검색
          </button>
        </div>

        {/* 검색 옵션 */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted">
            <SlidersHorizontal className="w-4 h-4" />
            <span>검색 모드:</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'hybrid'}
              onChange={() => setMode('hybrid')}
              className="accent-primary"
            />
            <span>통합 검색</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'keyword'}
              onChange={() => setMode('keyword')}
              className="accent-primary"
            />
            <span>키워드 검색</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'semantic'}
              onChange={() => setMode('semantic')}
              className="accent-primary"
            />
            <span>AI 의미 검색</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={includeAnswer}
              onChange={(e) => setIncludeAnswer(e.target.checked)}
              className="accent-primary"
            />
            <Sparkles className="w-4 h-4 text-warning" />
            <span>AI 답변 생성</span>
          </label>
        </div>
      </form>

      {/* AI 답변 */}
      {aiAnswer && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">AI 추천 답변</h3>
          </div>
          <div className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
            {aiAnswer}
          </div>
        </div>
      )}

      {/* 검색 결과 */}
      {searched && (
        <div>
          <p className="text-sm text-muted mb-4">
            검색 결과: {results.length}건
          </p>

          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.source === 'knowledge' ? (
                        <BookOpen className="w-4 h-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-green-500" />
                      )}
                      <Link
                        href={
                          result.source === 'knowledge'
                            ? `/knowledge/${result.id}`
                            : '#'
                        }
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {result.title}
                      </Link>
                      {result.category && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">
                          {result.category}
                        </span>
                      )}
                    </div>
                    {result.similarity && (
                      <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                        유사도 {(result.similarity * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted leading-relaxed">
                    {highlightText(result.content)}
                  </p>
                  {result.created_at && (
                    <p className="text-xs text-muted mt-2">
                      {new Date(result.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>검색 결과가 없습니다.</p>
              <p className="text-sm mt-1">
                다른 키워드로 검색하거나 AI 의미 검색을 시도해보세요.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
