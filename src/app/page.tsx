'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  Copy,
  Check,
  MessageSquare,
  BookOpen,
  Sparkles,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

interface ChatResult {
  id: string;
  title: string;
  content: string;
  sender: string;
  room_name: string;
  similarity?: number;
  created_at?: string;
}

interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  category: string;
  source_type: string;
  similarity?: number;
  created_at?: string;
}

interface PopularItem {
  query?: string;
  topic?: string;
  count: number;
  source: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [chatResults, setChatResults] = useState<ChatResult[]>([]);
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [popularSearches, setPopularSearches] = useState<PopularItem[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<PopularItem[]>([]);

  useEffect(() => {
    fetchPopular();
  }, []);

  async function fetchPopular() {
    try {
      const res = await fetch('/api/search-logs');
      const data = await res.json();
      setPopularSearches(data.popularSearches || []);
      setRecommendedTopics(data.recommendedTopics || []);
    } catch {
      // ignore
    }
  }

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setQuery(q);
    setLoading(true);
    setSearched(true);
    setAiAnswer(null);
    setChatResults([]);
    setKnowledgeResults([]);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      setChatResults(data.chatResults || []);
      setKnowledgeResults(data.knowledgeResults || []);
      setAiAnswer(data.aiAnswer || null);
    } catch {
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      fetchPopular(); // 검색 후 인기 검색어 갱신
    }
  }

  async function handleCopy() {
    if (!aiAnswer) return;
    await navigator.clipboard.writeText(aiAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function highlightText(text: string, maxLength = 150) {
    const truncated =
      text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    if (!query) return truncated;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
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

  const hasResults = chatResults.length > 0 || knowledgeResults.length > 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      {!searched && (
        <div className="text-center pt-12 pb-8">
          <h1 className="text-3xl font-bold mb-2">무엇을 찾고 계신가요?</h1>
          <p className="text-muted">
            교육생 질문을 입력하면 AI가 답변을 추천해드립니다
          </p>
        </div>
      )}

      {/* 검색바 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className={`${searched ? 'mb-6' : 'mb-10'}`}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="교육생 질문을 입력하세요... (예: 환불 절차, 상표권 등록)"
            className="w-full pl-12 pr-28 py-4 text-lg border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            검색
          </button>
        </div>
      </form>

      {/* 검색 전: 추천 주제 */}
      {!searched && (
        <div className="space-y-6">
          {/* 데이터 분석 기반 추천 */}
          {recommendedTopics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted">
                  교육생들이 자주 묻는 주제
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendedTopics.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(item.topic || '')}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                  >
                    {item.topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 검색 기록 기반 인기 검색어 */}
          {popularSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-muted" />
                <span className="text-sm font-medium text-muted">
                  최근 많이 검색한 질문
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(item.query || '')}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                  >
                    {item.query}
                    <span className="text-xs text-slate-400">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 추천 주제가 없을 때 */}
          {recommendedTopics.length === 0 && popularSearches.length === 0 && (
            <div className="text-center py-8 text-muted">
              <p className="text-sm">
                데이터를 등록하면 자주 묻는 주제가 자동으로 표시됩니다
              </p>
            </div>
          )}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-muted">AI가 답변을 준비하고 있습니다...</p>
        </div>
      )}

      {/* 검색 결과 */}
      {searched && !loading && (
        <div className="space-y-6">
          {/* AI 추천 답변 */}
          {aiAnswer && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-blue-800">AI 추천 답변</h2>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      복사됨!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      답변 복사
                    </>
                  )}
                </button>
              </div>
              <div className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                {aiAnswer}
              </div>
            </div>
          )}

          {/* 관련 과거 대화 */}
          {chatResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-sm">
                  관련 과거 대화 ({chatResults.length}건)
                </h2>
              </div>
              <div className="space-y-2">
                {chatResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {result.sender}
                        </span>
                        <span className="text-xs text-muted">
                          {result.room_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.similarity && (
                          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded">
                            {(result.similarity * 100).toFixed(0)}%
                          </span>
                        )}
                        {result.created_at && (
                          <span className="text-xs text-muted">
                            {new Date(result.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {highlightText(result.content)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 관련 강의 대본/지식 */}
          {knowledgeResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <h2 className="font-semibold text-sm">
                  관련 강의 대본 ({knowledgeResults.length}건)
                </h2>
              </div>
              <div className="space-y-2">
                {knowledgeResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{result.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">
                          {result.category}
                        </span>
                        {result.created_at && (
                          <span className="text-xs text-muted">
                            {new Date(result.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {highlightText(result.content, 250)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 결과 없음 */}
          {!hasResults && !aiAnswer && (
            <div className="text-center py-16 text-muted">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">검색 결과가 없습니다</p>
              <p className="text-sm mt-1">
                다른 키워드로 검색해보세요
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
