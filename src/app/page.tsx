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
  PenLine,
  Save,
  Star,
} from 'lucide-react';

interface QAPair {
  id: string;
  question: { sender: string; message: string; date: string };
  answers: { sender: string; message: string; date: string }[];
  room_name: string;
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

interface CustomAnswer {
  id: string;
  question: string;
  answer: string;
  source: string;
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
  const [customAnswer, setCustomAnswer] = useState<CustomAnswer | null>(null);
  const [qaPairs, setQaPairs] = useState<QAPair[]>([]);
  const [knowledgeResults, setKnowledgeResults] = useState<KnowledgeResult[]>([]);
  const [copied, setCopied] = useState(false);
  const [popularSearches, setPopularSearches] = useState<PopularItem[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<PopularItem[]>([]);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetchPopular(); }, []);

  async function fetchPopular() {
    try {
      const res = await fetch('/api/search-logs');
      const data = await res.json();
      setPopularSearches(data.popularSearches || []);
      setRecommendedTopics(data.recommendedTopics || []);
    } catch { /* ignore */ }
  }

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setQuery(q);
    setLoading(true);
    setSearched(true);
    setAiAnswer(null);
    setCustomAnswer(null);
    setQaPairs([]);
    setKnowledgeResults([]);
    setEditing(false);
    setSaved(false);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      setQaPairs(data.qaPairs || []);
      setKnowledgeResults(data.knowledgeResults || []);
      setCustomAnswer(data.customAnswer || null);
      setAiAnswer(data.aiAnswer || null);
    } catch {
      alert('검색 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      fetchPopular();
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function startEditing() {
    setEditText(customAnswer?.answer || aiAnswer || '');
    setEditing(true);
    setSaved(false);
  }

  async function handleSaveAnswer() {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/custom-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, answer: editText, source: 'edited' }),
      });
      if (res.ok) {
        setEditing(false);
        setSaved(true);
        setCustomAnswer({ id: '', question: query, answer: editText, source: 'edited' });
      }
    } catch { alert('저장에 실패했습니다.'); }
    finally { setSaving(false); }
  }

  const hasResults = qaPairs.length > 0 || knowledgeResults.length > 0;
  const displayAnswer = customAnswer?.answer || aiAnswer;

  return (
    <div className="max-w-4xl mx-auto">
      {!searched && (
        <div className="text-center pt-12 pb-8">
          <h1 className="text-3xl font-bold mb-2">무엇을 찾고 계신가요?</h1>
          <p className="text-muted">교육생 질문을 입력하면 AI가 답변을 추천해드립니다</p>
        </div>
      )}

      {/* 검색바 */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className={`${searched ? 'mb-6' : 'mb-10'}`}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="교육생 질문을 입력하세요... (예: 환불 절차, 상표권 등록)"
            className="w-full pl-12 pr-28 py-4 text-lg border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            autoFocus />
          <button type="submit" disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} 검색
          </button>
        </div>
      </form>

      {/* 검색 전: 추천 주제 */}
      {!searched && (
        <div className="space-y-6">
          {recommendedTopics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-muted">교육생들이 자주 묻는 주제</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendedTopics.map((item, i) => (
                  <button key={i} onClick={() => handleSearch(item.topic || '')}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors">
                    {item.topic}
                  </button>
                ))}
              </div>
            </div>
          )}
          {popularSearches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-muted" />
                <span className="text-sm font-medium text-muted">최근 많이 검색한 질문</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((item, i) => (
                  <button key={i} onClick={() => handleSearch(item.query || '')}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-sm hover:bg-slate-200 transition-colors flex items-center gap-1.5">
                    {item.query} <span className="text-xs text-slate-400">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {recommendedTopics.length === 0 && popularSearches.length === 0 && (
            <div className="text-center py-8 text-muted">
              <p className="text-sm">데이터를 등록하면 자주 묻는 주제가 자동으로 표시됩니다</p>
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

          {/* 커스텀 답변 (최우선) */}
          {customAnswer && !editing && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-semibold text-emerald-800">등록된 답변</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCopy(customAnswer.answer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors">
                    {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨!</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                  </button>
                  <button onClick={startEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 rounded-lg text-sm hover:bg-emerald-50 transition-colors">
                    <PenLine className="w-3.5 h-3.5" /> 수정
                  </button>
                </div>
              </div>
              <div className="text-sm text-emerald-900 whitespace-pre-wrap leading-relaxed">{customAnswer.answer}</div>
            </div>
          )}

          {/* AI 추천 답변 */}
          {aiAnswer && !customAnswer && !editing && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-blue-800">AI 추천 답변</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCopy(aiAnswer)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    {copied ? <><Check className="w-3.5 h-3.5" /> 복사됨!</> : <><Copy className="w-3.5 h-3.5" /> 복사</>}
                  </button>
                  <button onClick={startEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 transition-colors">
                    <PenLine className="w-3.5 h-3.5" /> 수정하여 저장
                  </button>
                </div>
              </div>
              <div className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{aiAnswer}</div>
            </div>
          )}

          {/* 저장 완료 */}
          {saved && !editing && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">답변이 저장되었습니다. 다음에 유사한 질문 시 이 답변이 우선 표시됩니다.</span>
            </div>
          )}

          {/* 답변 수정 모드 */}
          {editing && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-5 h-5 text-amber-600" />
                <h2 className="font-semibold text-amber-800">답변 수정</h2>
              </div>
              <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={8}
                className="w-full px-4 py-3 border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y text-sm leading-relaxed mb-3" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">취소</button>
                <button onClick={handleSaveAnswer} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-amber-600 text-white rounded-xl text-sm hover:bg-amber-700 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 저장
                </button>
              </div>
            </div>
          )}

          {/* 관련 과거 Q&A */}
          {qaPairs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-green-600" />
                <h2 className="font-semibold text-sm">관련 과거 Q&A ({qaPairs.length}건)</h2>
              </div>
              <div className="space-y-3">
                {qaPairs.map((qa, index) => (
                  <div key={qa.id || index} className="bg-card rounded-xl border border-border overflow-hidden">
                    {/* 질문 */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Q</span>
                          <span className="text-sm font-medium">{qa.question.sender}</span>
                          <span className="text-xs text-muted">{qa.room_name}</span>
                        </div>
                        <span className="text-xs text-muted">
                          {new Date(qa.question.date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 ml-8">{qa.question.message}</p>
                    </div>
                    {/* 답변들 */}
                    {qa.answers.length > 0 && (
                      <div className="px-5 py-3">
                        {qa.answers.map((ans, ai) => (
                          <div key={ai} className={ai > 0 ? 'mt-3 pt-3 border-t border-border/50' : ''}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">A</span>
                              <span className="text-sm font-medium">{ans.sender}</span>
                            </div>
                            <p className="text-sm text-slate-600 ml-8 leading-relaxed">{ans.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {qa.answers.length === 0 && (
                      <div className="px-5 py-3 text-xs text-muted">답변을 찾지 못했습니다</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 관련 강의 대본 */}
          {knowledgeResults.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <h2 className="font-semibold text-sm">관련 강의 대본 ({knowledgeResults.length}건)</h2>
              </div>
              <div className="space-y-2">
                {knowledgeResults.map((result) => (
                  <div key={result.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{result.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded">{result.category}</span>
                        {result.created_at && (
                          <span className="text-xs text-muted">{new Date(result.created_at).toLocaleDateString('ko-KR')}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {result.content.length > 250 ? result.content.slice(0, 250) + '...' : result.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 결과 없음 */}
          {!hasResults && !displayAnswer && (
            <div className="text-center py-16 text-muted">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">검색 결과가 없습니다</p>
              <p className="text-sm mt-1">다른 키워드로 검색해보세요</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
