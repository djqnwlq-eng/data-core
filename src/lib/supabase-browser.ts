import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 브라우저 사이드 Supabase 클라이언트 (싱글톤)
let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowser() {
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
