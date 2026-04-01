'use client';

import { useState, useRef, useEffect, DragEvent } from 'react';
import PageHeader from '@/components/PageHeader';
import {
  MessageSquare,
  PenLine,
  FileUp,
  Upload,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react';

type Tab = 'chat' | 'knowledge';

interface UploadResult {
  fileName: string;
  roomName: string;
  totalMessages: number;
  savedCount: number;
  error?: string;
}

export default function RegisterPage() {
  const [tab, setTab] = useState<Tab>('chat');

  // 채팅 업로드 (다중 파일)
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const [chatResults, setChatResults] = useState<UploadResult[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  // 지식 등록
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('일반');
  const [sourceType, setSourceType] = useState<'direct' | 'file'>('direct');
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSuccess, setKnowledgeSuccess] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.data || []);
    } catch {
      // ignore
    }
  }

  // 파일 추가
  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles);
    setChatFiles((prev) => [...prev, ...arr]);
    setChatResults([]);
  }

  function removeFile(index: number) {
    setChatFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // 드래그 앤 드롭
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  async function handleChatUpload(e: React.FormEvent) {
    e.preventDefault();
    if (chatFiles.length === 0) return;

    setChatLoading(true);
    setChatResults([]);
    setUploadProgress(`0 / ${chatFiles.length} 파일 처리 중...`);

    const allResults: UploadResult[] = [];

    // 파일을 5개씩 배치로 업로드
    const batchSize = 5;
    for (let i = 0; i < chatFiles.length; i += batchSize) {
      const batch = chatFiles.slice(i, i + batchSize);
      setUploadProgress(`${i} / ${chatFiles.length} 파일 처리 중...`);

      const formData = new FormData();
      for (const file of batch) {
        formData.append('files', file);
      }

      try {
        const res = await fetch('/api/chat-upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.results) {
          allResults.push(...data.results);
        }
      } catch {
        for (const file of batch) {
          allResults.push({
            fileName: file.name,
            roomName: '',
            totalMessages: 0,
            savedCount: 0,
            error: '네트워크 오류',
          });
        }
      }
    }

    setChatResults(allResults);
    setChatFiles([]);
    setChatLoading(false);
    setUploadProgress('');
  }

  async function handleKnowledgeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setKnowledgeLoading(true);
    setKnowledgeSuccess(false);

    try {
      if (sourceType === 'file' && knowledgeFile) {
        const formData = new FormData();
        formData.append('file', knowledgeFile);
        formData.append('title', title);
        formData.append('category', category);
        const res = await fetch('/api/knowledge/upload', { method: 'POST', body: formData });
        if (res.ok) {
          setKnowledgeSuccess(true);
          setTitle('');
          setKnowledgeFile(null);
        } else {
          const data = await res.json();
          alert(data.error || '업로드에 실패했습니다.');
        }
      } else {
        const res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, category, sourceType: 'direct', tags: [] }),
        });
        if (res.ok) {
          setKnowledgeSuccess(true);
          setTitle('');
          setContent('');
        } else {
          const data = await res.json();
          alert(data.error || '등록에 실패했습니다.');
        }
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setKnowledgeLoading(false);
    }
  }

  const totalFilesSize = chatFiles.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="데이터 등록" description="채팅 기록과 강의 대본을 등록합니다." />

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
            tab === 'chat'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          카카오톡 채팅
        </button>
        <button
          onClick={() => setTab('knowledge')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
            tab === 'knowledge'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          <PenLine className="w-4 h-4" />
          강의 대본 / 지식
        </button>
      </div>

      {/* 카카오톡 채팅 업로드 */}
      {tab === 'chat' && (
        <form onSubmit={handleChatUpload} className="bg-card rounded-2xl border border-border p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-700">
              여러 파일을 한번에 드래그하거나 선택할 수 있습니다. 파일은 빠르게 저장되며, AI 분석은 백그라운드에서 자동 진행됩니다.
            </p>
          </div>

          {/* 드래그 앤 드롭 영역 */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => chatFileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors mb-4 ${
              dragging ? 'border-primary bg-blue-50' : 'border-border hover:border-primary/50'
            }`}
          >
            <input
              ref={chatFileRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
            <MessageSquare className={`w-12 h-12 mx-auto mb-3 ${dragging ? 'text-primary' : 'text-muted opacity-30'}`} />
            {dragging ? (
              <p className="text-primary font-medium">여기에 놓으세요!</p>
            ) : (
              <>
                <p className="text-muted font-medium">파일을 여기로 드래그하거나 클릭하여 선택</p>
                <p className="text-xs text-muted mt-1">여러 파일을 한번에 선택할 수 있습니다 (.csv, .txt)</p>
              </>
            )}
          </div>

          {/* 선택된 파일 목록 */}
          {chatFiles.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  선택된 파일: {chatFiles.length}개 ({(totalFilesSize / 1024).toFixed(0)}KB)
                </span>
                <button
                  type="button"
                  onClick={() => setChatFiles([])}
                  className="text-xs text-danger hover:underline"
                >
                  전체 삭제
                </button>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {chatFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm"
                  >
                    <span className="truncate flex-1 mr-2">{file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{(file.size / 1024).toFixed(0)}KB</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-muted hover:text-danger"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={chatLoading || chatFiles.length === 0}
            className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {chatLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {uploadProgress}</>
            ) : (
              <><Upload className="w-4 h-4" /> {chatFiles.length}개 파일 업로드</>
            )}
          </button>

          {/* 업로드 결과 */}
          {chatResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">
                    업로드 완료! (총 {chatResults.reduce((s, r) => s + r.savedCount, 0)}건 저장)
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {chatResults.map((result, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className={result.error ? 'text-red-600' : 'text-green-700'}>
                        {result.roomName || result.fileName}
                      </span>
                      <span className="text-green-600">
                        {result.error || `${result.savedCount}건`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted text-center">
                AI 의미 검색용 분석은 백그라운드에서 자동 진행됩니다. 키워드 검색은 바로 가능합니다.
              </p>
            </div>
          )}
        </form>
      )}

      {/* 강의 대본 / 지식 등록 */}
      {tab === 'knowledge' && (
        <form onSubmit={handleKnowledgeSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSourceType('direct')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                sourceType === 'direct' ? 'bg-slate-200 font-medium' : 'bg-slate-50 text-muted'
              }`}
            >
              <PenLine className="w-3.5 h-3.5" /> 직접 입력
            </button>
            <button
              type="button"
              onClick={() => setSourceType('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                sourceType === 'file' ? 'bg-slate-200 font-medium' : 'bg-slate-50 text-muted'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" /> 파일 업로드
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 상표권 등록 안내 대본"
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {sourceType === 'direct' ? (
            <div>
              <label className="block text-sm font-medium mb-1.5">내용</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="강의 대본 또는 CS 답변 내용을 입력하세요..."
                rows={10}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1.5">파일 선택</label>
              <input
                type="file"
                onChange={(e) => setKnowledgeFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-3 border border-border rounded-lg"
              />
              <p className="text-xs text-muted mt-1">.txt, .md, .csv 파일 지원</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={knowledgeLoading}
            className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {knowledgeLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 등록 중...</>
            ) : (
              '등록'
            )}
          </button>

          {knowledgeSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">등록 완료!</span>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
