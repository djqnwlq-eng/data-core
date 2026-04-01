'use client';

import { useState, useRef, DragEvent } from 'react';
import PageHeader from '@/components/PageHeader';
import { Upload, Loader2, CheckCircle, MessageSquare } from 'lucide-react';

export default function ChatUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{
    roomName: string;
    totalMessages: number;
    savedCount: number;
  } | null>(null);

  function handleFile(f: File) {
    setFile(f);
    setResult(null);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/chat-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
        setFile(null);
      } else {
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
        title="카카오톡 채팅 업로드"
        description="카카오톡에서 내보낸 대화 파일을 업로드하면 자동으로 파싱하여 저장합니다."
      />

      {/* 업로드 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">
          카카오톡 대화 내보내기 방법
        </h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>카카오톡 채팅방 열기</li>
          <li>우측 상단 메뉴 (삼줄) 클릭</li>
          <li>하단의 &quot;대화 내보내기&quot; 선택</li>
          <li>내보내기 형식 선택 (CSV 또는 텍스트)</li>
          <li>저장된 파일을 아래 영역에 <strong>드래그 앤 드롭</strong></li>
        </ol>
      </div>

      {/* 업로드 폼 */}
      <form
        onSubmit={handleUpload}
        className="bg-card rounded-xl border border-border p-6"
      >
        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-12 text-center mb-6 cursor-pointer transition-colors ${
            dragging
              ? 'border-primary bg-blue-50'
              : 'border-border hover:border-primary/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="hidden"
          />
          <MessageSquare
            className={`w-16 h-16 mx-auto mb-4 ${
              dragging ? 'text-primary' : 'text-muted opacity-30'
            }`}
          />
          {file ? (
            <div>
              <p className="text-lg font-medium text-primary">{file.name}</p>
              <p className="text-sm text-muted mt-1">
                {(file.size / 1024).toFixed(1)}KB
              </p>
            </div>
          ) : dragging ? (
            <p className="text-primary font-medium">여기에 놓으세요!</p>
          ) : (
            <>
              <p className="text-muted font-medium">
                파인더에서 파일을 여기로 드래그하거나 클릭하여 선택
              </p>
              <p className="text-xs text-muted mt-2">
                .csv, .txt 파일 지원
              </p>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              업로드 및 분석 중... (시간이 다소 걸릴 수 있습니다)
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              업로드
            </>
          )}
        </button>
      </form>

      {/* 업로드 결과 */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">업로드 완료!</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-green-600">채팅방</p>
              <p className="font-medium text-green-900">{result.roomName}</p>
            </div>
            <div>
              <p className="text-green-600">총 메시지</p>
              <p className="font-medium text-green-900">
                {result.totalMessages}건
              </p>
            </div>
            <div>
              <p className="text-green-600">저장된 메시지</p>
              <p className="font-medium text-green-900">
                {result.savedCount}건
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
