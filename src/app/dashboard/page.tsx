'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import {
  BookOpen,
  MessageSquare,
  FileText,
  Search,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface Stats {
  knowledgeCount: number;
  chatCount: number;
  manualCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    knowledgeCount: 0,
    chatCount: 0,
    manualCount: 0,
  });
  const [recentKnowledge, setRecentKnowledge] = useState<
    { id: string; title: string; category: string; created_at: string }[]
  >([]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, []);

  async function fetchStats() {
    try {
      const [knowledgeRes, manualRes] = await Promise.all([
        fetch('/api/knowledge?limit=1'),
        fetch('/api/manual'),
      ]);
      const knowledgeData = await knowledgeRes.json();
      const manualData = await manualRes.json();

      setStats({
        knowledgeCount: knowledgeData.total || 0,
        chatCount: 0,
        manualCount: manualData.data?.length || 0,
      });
    } catch {
      // 초기 상태 유지
    }
  }

  async function fetchRecent() {
    try {
      const res = await fetch('/api/knowledge?limit=5');
      const data = await res.json();
      setRecentKnowledge(data.data || []);
    } catch {
      // 초기 상태 유지
    }
  }

  const statCards = [
    {
      label: '등록된 지식',
      value: stats.knowledgeCount,
      icon: BookOpen,
      color: 'bg-blue-500',
      href: '/knowledge',
    },
    {
      label: '채팅 기록',
      value: stats.chatCount,
      icon: MessageSquare,
      color: 'bg-green-500',
      href: '/chat-upload',
    },
    {
      label: '매뉴얼',
      value: stats.manualCount,
      icon: FileText,
      color: 'bg-purple-500',
      href: '/manual',
    },
  ];

  return (
    <div>
      <PageHeader
        title="대시보드"
        description="교육 CS 지식 베이스 현황을 한눈에 확인하세요."
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">{card.label}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* 빠른 검색 */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">빠른 검색</h2>
        </div>
        <form
          action="/search"
          method="GET"
          className="flex gap-3"
        >
          <input
            type="text"
            name="q"
            placeholder="검색어를 입력하세요... (예: 환불 절차, 수강 변경)"
            className="flex-1 px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            검색
          </button>
        </form>
      </div>

      {/* 최근 등록된 지식 */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">최근 등록된 지식</h2>
          </div>
          <Link
            href="/knowledge"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            전체 보기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentKnowledge.length > 0 ? (
          <div className="space-y-3">
            {recentKnowledge.map((item) => (
              <Link
                key={item.id}
                href={`/knowledge/${item.id}`}
                className="block p-4 rounded-lg border border-border hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{item.title}</h3>
                    <span className="text-xs text-muted mt-1 inline-block px-2 py-0.5 bg-slate-100 rounded">
                      {item.category}
                    </span>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>아직 등록된 지식이 없습니다.</p>
            <Link
              href="/knowledge/new"
              className="text-primary hover:underline text-sm mt-2 inline-block"
            >
              첫 번째 지식을 등록해보세요
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
