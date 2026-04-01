'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { PlusCircle, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

interface Knowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  source_type: string;
  tags: string[];
  created_at: string;
}

export default function KnowledgeListPage() {
  const [items, setItems] = useState<Knowledge[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('전체');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );
  const limit = 10;

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [page, category]);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.data || []);
    } catch {
      // ignore
    }
  }

  async function fetchKnowledge() {
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        category,
      });
      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setItems(data.data || []);
      setTotal(data.total || 0);
    } catch {
      // ignore
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const res = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchKnowledge();
    }
  }

  const totalPages = Math.ceil(total / limit);
  const sourceLabel = (type: string) => {
    switch (type) {
      case 'direct':
        return '직접 입력';
      case 'file':
        return '파일';
      case 'chat':
        return '채팅';
      default:
        return type;
    }
  };

  return (
    <div>
      <PageHeader
        title="지식 목록"
        description={`총 ${total}건의 지식이 등록되어 있습니다.`}
        action={
          <Link
            href="/knowledge/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4" />
            새 지식 등록
          </Link>
        }
      />

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => {
            setCategory('전체');
            setPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            category === '전체'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setCategory(cat.name);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === cat.name
                ? 'bg-primary text-white'
                : 'bg-card border border-border text-muted hover:bg-slate-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {items.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-muted">
                  제목
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted w-24">
                  카테고리
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted w-24">
                  유형
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted w-28">
                  등록일
                </th>
                <th className="text-center px-6 py-3 text-sm font-medium text-muted w-24">
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-b-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/knowledge/${item.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {item.title}
                    </Link>
                    {item.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    {sourceLabel(item.source_type)}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted">
                    {new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/knowledge/${item.id}`}
                        className="p-1.5 text-muted hover:text-primary transition-colors"
                        title="보기"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-muted hover:text-danger transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-16 text-muted">
            <p>등록된 지식이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted px-4">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg border border-border hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
