'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { MessageSquare, BookOpen, Trash2 } from 'lucide-react';

interface Knowledge {
  id: string;
  title: string;
  category: string;
  source_type: string;
  created_at: string;
}

export default function DataPage() {
  const [tab, setTab] = useState<'knowledge' | 'chat'>('knowledge');
  const [knowledgeItems, setKnowledgeItems] = useState<Knowledge[]>([]);
  const [knowledgeTotal, setKnowledgeTotal] = useState(0);
  const [chatRooms, setChatRooms] = useState<{ room_name: string; count: number }[]>([]);

  useEffect(() => {
    fetchKnowledge();
    fetchChatRooms();
  }, []);

  async function fetchKnowledge() {
    const res = await fetch('/api/knowledge?limit=100');
    const data = await res.json();
    setKnowledgeItems(data.data || []);
    setKnowledgeTotal(data.total || 0);
  }

  async function fetchChatRooms() {
    // 채팅방 목록은 간단하게 가져오기
    const res = await fetch('/api/search?q=*&mode=keyword');
    // 별도 API가 없으니 chat_messages에서 room_name 집계는 추후 추가
    try {
      const data = await res.json();
      const rooms: Record<string, number> = {};
      if (data.chatResults) {
        for (const r of data.chatResults) {
          rooms[r.room_name] = (rooms[r.room_name] || 0) + 1;
        }
      }
      setChatRooms(
        Object.entries(rooms).map(([room_name, count]) => ({ room_name, count }))
      );
    } catch {
      // ignore
    }
  }

  async function handleDeleteKnowledge(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    const res = await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchKnowledge();
  }

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader
        title="등록된 데이터"
        description={`강의 대본 ${knowledgeTotal}건이 등록되어 있습니다.`}
      />

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('knowledge')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
            tab === 'knowledge'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          강의 대본 / 지식 ({knowledgeTotal})
        </button>
        <button
          onClick={() => setTab('chat')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-colors ${
            tab === 'chat'
              ? 'bg-primary text-white'
              : 'bg-card border border-border text-muted hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          채팅 기록
        </button>
      </div>

      {/* 강의 대본 목록 */}
      {tab === 'knowledge' && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {knowledgeItems.length > 0 ? (
            <div className="divide-y divide-border">
              {knowledgeItems.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{item.category}</span>
                      <span className="text-xs text-muted">
                        {item.source_type === 'direct' ? '직접 입력' : '파일'}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(item.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKnowledge(item.id)}
                    className="p-2 text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted">
              <p>등록된 강의 대본이 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {/* 채팅 기록 */}
      {tab === 'chat' && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {chatRooms.length > 0 ? (
            <div className="divide-y divide-border">
              {chatRooms.map((room) => (
                <div key={room.room_name} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <p className="font-medium">{room.room_name}</p>
                  </div>
                  <span className="text-sm text-muted">{room.count}건</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted">
              <p>업로드된 채팅 기록이 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
