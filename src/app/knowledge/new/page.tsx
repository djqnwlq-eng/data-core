'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import { FileUp, PenLine, Loader2 } from 'lucide-react';

type InputMode = 'direct' | 'file';

export default function NewKnowledgePage() {
  const router = useRouter();
  const [mode, setMode] = useState<InputMode>('direct');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  );

  // 직접 입력 폼
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('일반');
  const [tags, setTags] = useState('');

  // 파일 업로드 폼
  const [file, setFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState('');
  const [fileCategory, setFileCategory] = useState('일반');
  const [fileTags, setFileTags] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.data || []);
    } catch {
      // 기본 카테고리 사용
    }
  }

  async function handleDirectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          category,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          sourceType: 'direct',
        }),
      });

      if (res.ok) {
        router.push('/knowledge');
      } else {
        const data = await res.json();
        alert(data.error || '등록에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', fileTitle);
      formData.append('category', fileCategory);
      formData.append('tags', fileTags);

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.push('/knowledge');
      } else {
        const data = await res.json();
        alert(data.error || '업로드에 실패했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="지식 등록"
        description="강의 대본, CS 답변 등 지식을 등록합니다."
      />

      {/* 입력 방식 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('direct')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
            mode === 'direct'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          <PenLine className="w-4 h-4" />
          직접 입력
        </button>
        <button
          onClick={() => setMode('file')}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-colors ${
            mode === 'file'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          <FileUp className="w-4 h-4" />
          파일 업로드
        </button>
      </div>

      {/* 직접 입력 폼 */}
      {mode === 'direct' && (
        <form
          onSubmit={handleDirectSubmit}
          className="bg-card rounded-xl border border-border p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              제목 <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 환불 절차 안내"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              내용 <span className="text-danger">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="지식 내용을 입력하세요. 강의 대본, CS 답변 가이드, 절차 설명 등..."
              rows={12}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                태그 <span className="text-xs text-muted">(쉼표로 구분)</span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="예: 환불, 취소, 결제"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                등록 중... (AI 임베딩 생성 포함)
              </>
            ) : (
              '지식 등록'
            )}
          </button>
        </form>
      )}

      {/* 파일 업로드 폼 */}
      {mode === 'file' && (
        <form
          onSubmit={handleFileSubmit}
          className="bg-card rounded-xl border border-border p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-2">
              파일 선택 <span className="text-danger">*</span>
            </label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".txt,.md,.csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
                required
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <FileUp className="w-12 h-12 mx-auto mb-3 text-muted opacity-50" />
                {file ? (
                  <p className="text-sm font-medium text-primary">
                    {file.name} ({(file.size / 1024).toFixed(1)}KB)
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      클릭하여 파일을 선택하세요
                    </p>
                    <p className="text-xs text-muted mt-1">
                      .txt, .md, .csv, .json 파일 지원
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              제목 <span className="text-xs text-muted">(비워두면 파일명 사용)</span>
            </label>
            <input
              type="text"
              value={fileTitle}
              onChange={(e) => setFileTitle(e.target.value)}
              placeholder="예: 1월 강의 대본"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">카테고리</label>
              <select
                value={fileCategory}
                onChange={(e) => setFileCategory(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                태그 <span className="text-xs text-muted">(쉼표로 구분)</span>
              </label>
              <input
                type="text"
                value={fileTags}
                onChange={(e) => setFileTags(e.target.value)}
                placeholder="예: 강의, 대본, 1월"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업로드 중... (AI 임베딩 생성 포함)
              </>
            ) : (
              '파일 업로드'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
