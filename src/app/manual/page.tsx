'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import {
  Sparkles,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface Manual {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export default function ManualPage() {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchManuals();
  }, []);

  async function fetchManuals() {
    const res = await fetch('/api/manual');
    const data = await res.json();
    setManuals(data.data || []);
  }

  async function handleAutoGenerate() {
    if (!confirm('AI가 데이터를 분석하여 매뉴얼을 자동 생성합니다. 시간이 다소 걸릴 수 있습니다. 진행하시겠습니까?')) return;

    setAutoLoading(true);
    try {
      const res = await fetch('/api/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoGenerate: true }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchManuals();
        alert(`${data.generated?.length || 0}개 카테고리의 매뉴얼이 생성되었습니다!`);
      } else {
        alert(data.error || '매뉴얼 생성에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setAutoLoading(false);
    }
  }

  async function handleManualGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (res.ok) {
        setTopic('');
        fetchManuals();
        if (data.data) setExpandedId(data.data.id);
      } else {
        alert(data.error || '매뉴얼 생성에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(manual: Manual) {
    await navigator.clipboard.writeText(manual.content);
    setCopiedId(manual.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="CS 매뉴얼"
        description="축적된 데이터를 기반으로 AI가 자동 생성하는 CS 매뉴얼"
        action={
          <button
            onClick={handleAutoGenerate}
            disabled={autoLoading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors text-sm font-medium disabled:opacity-50"
          >
            {autoLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 자동 생성 중...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> 전체 자동 생성</>
            )}
          </button>
        }
      />

      {/* 수동 생성 */}
      <form onSubmit={handleManualGenerate} className="bg-card rounded-2xl border border-border p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">특정 주제로 매뉴얼 생성</span>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="주제 입력 (예: 상표권, 환불 절차, OEM 업체)"
            className="flex-1 px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            생성
          </button>
        </div>
      </form>

      {/* 매뉴얼 목록 */}
      <div className="space-y-3">
        {manuals.length > 0 ? (
          manuals.map((manual) => (
            <div key={manual.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === manual.id ? null : manual.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <h3 className="font-medium">{manual.title}</h3>
                    <span className="text-xs text-muted">
                      {new Date(manual.updated_at).toLocaleDateString('ko-KR')} 업데이트
                    </span>
                  </div>
                </div>
                {expandedId === manual.id ? (
                  <ChevronUp className="w-5 h-5 text-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted" />
                )}
              </button>
              {expandedId === manual.id && (
                <div className="px-5 pb-5 border-t border-border">
                  <div className="flex justify-end mt-3 mb-2">
                    <button
                      onClick={() => handleCopy(manual)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                    >
                      {copiedId === manual.id ? (
                        <><Check className="w-3.5 h-3.5 text-green-600" /> 복사됨!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> 내용 복사</>
                      )}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {manual.content}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-muted bg-card rounded-2xl border border-border">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">생성된 매뉴얼이 없습니다</p>
            <p className="text-sm mt-1">
              &quot;전체 자동 생성&quot; 버튼을 눌러 데이터 기반 매뉴얼을 만들어보세요
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
