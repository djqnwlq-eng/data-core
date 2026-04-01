-- Data Core: 교육 CS 지식 베이스 시스템
-- Supabase SQL Editor에서 실행하세요

-- 1. pgvector 확장 활성화 (벡터 검색용)
create extension if not exists vector with schema extensions;

-- 2. 지식 테이블 (강의 대본, 직접 입력, 파일 업로드)
create table public.knowledge (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  category text not null default '일반',
  source_type text not null check (source_type in ('direct', 'file', 'chat')),
  file_name text,
  tags text[] default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. 채팅 메시지 테이블 (카카오톡 내보내기)
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  room_name text not null,
  sender text not null,
  message text not null,
  chat_date timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 4. 임베딩 테이블 (AI 의미 검색용)
create table public.embeddings (
  id uuid default gen_random_uuid() primary key,
  source_table text not null, -- 'knowledge' or 'chat_messages'
  source_id uuid not null,
  chunk_text text not null,
  embedding vector(768), -- Gemini text-embedding-004 = 768차원
  created_at timestamptz default now()
);

-- 5. 매뉴얼 테이블
create table public.manuals (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  category text not null default '일반',
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. 카테고리 관리 테이블
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  description text,
  created_at timestamptz default now()
);

-- 기본 카테고리 삽입
insert into public.categories (name, description) values
  ('일반', '일반적인 문의'),
  ('수강', '수강 관련 문의'),
  ('환불', '환불/취소 관련'),
  ('커리큘럼', '교육 과정 관련'),
  ('기술지원', '기술적 문의'),
  ('강의대본', '강의 스크립트');

-- 7. 벡터 유사도 검색 함수
create or replace function match_embeddings(
  query_embedding vector(768),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id uuid,
  source_table text,
  source_id uuid,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.source_table,
    e.source_id,
    e.chunk_text,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  where 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- 8. 전문 검색(Full Text Search) 인덱스
create index knowledge_content_search on public.knowledge
  using gin(to_tsvector('simple', title || ' ' || content));

create index chat_messages_search on public.chat_messages
  using gin(to_tsvector('simple', sender || ' ' || message));

-- 9. 벡터 인덱스 (HNSW - 빠른 유사도 검색)
create index embeddings_vector_idx on public.embeddings
  using hnsw (embedding vector_cosine_ops);

-- 10. RLS (Row Level Security) 정책
alter table public.knowledge enable row level security;
alter table public.chat_messages enable row level security;
alter table public.embeddings enable row level security;
alter table public.manuals enable row level security;
alter table public.categories enable row level security;

-- 인증된 사용자만 접근 가능
create policy "Authenticated users can read knowledge"
  on public.knowledge for select to authenticated using (true);

create policy "Authenticated users can insert knowledge"
  on public.knowledge for insert to authenticated with check (true);

create policy "Authenticated users can update knowledge"
  on public.knowledge for update to authenticated using (true);

create policy "Authenticated users can delete knowledge"
  on public.knowledge for delete to authenticated using (true);

create policy "Authenticated users can read chat_messages"
  on public.chat_messages for select to authenticated using (true);

create policy "Authenticated users can insert chat_messages"
  on public.chat_messages for insert to authenticated with check (true);

create policy "Authenticated users can read embeddings"
  on public.embeddings for select to authenticated using (true);

create policy "Authenticated users can insert embeddings"
  on public.embeddings for insert to authenticated with check (true);

create policy "Authenticated users can read manuals"
  on public.manuals for select to authenticated using (true);

create policy "Authenticated users can insert manuals"
  on public.manuals for insert to authenticated with check (true);

create policy "Authenticated users can update manuals"
  on public.manuals for update to authenticated using (true);

create policy "Anyone can read categories"
  on public.categories for select to authenticated using (true);

create policy "Authenticated users can insert categories"
  on public.categories for insert to authenticated with check (true);

-- 11. updated_at 자동 업데이트 트리거
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger knowledge_updated_at
  before update on public.knowledge
  for each row execute function update_updated_at();

create trigger manuals_updated_at
  before update on public.manuals
  for each row execute function update_updated_at();
