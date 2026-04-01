'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { ArrowLeft, Calendar, Tag, FolderOpen, FileType } from 'lucide-react';
import Link from 'next/link';

interface Knowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  source_type: string;
  file_name: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function KnowledgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Knowledge | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetail();
  }, [params.id]);

  async function fetchDetail() {
    try {
      const res = await fetch(`/api/knowledge?limit=100`);
      const data = await res.json();
      const found = data.data?.find(
        (k: Knowledge) => k.id === params.id
      );
      setItem(found || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted">로딩 중...</div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-muted">지식을 찾을 수 없습니다.</p>
        <Link href="/knowledge" className="text-primary hover:underline mt-2 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        돌아가기
      </button>

      <PageHeader title={item.title} />

      {/* 메타 정보 */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted">
          <FolderOpen className="w-4 h-4" />
          <span>{item.category}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <FileType className="w-4 h-4" />
          <span>
            {item.source_type === 'direct'
              ? '직접 입력'
              : item.source_type === 'file'
                ? `파일 (${item.file_name || ''})`
                : '채팅'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <Calendar className="w-4 h-4" />
          <span>
            {new Date(item.created_at).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>
        {item.tags?.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Tag className="w-4 h-4" />
            <div className="flex gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="bg-card rounded-xl border border-border p-8">
        <div className="whitespace-pre-wrap leading-relaxed text-sm">
          {item.content}
        </div>
      </div>
    </div>
  );
}
