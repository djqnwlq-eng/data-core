import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let _supabase: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error(
          'Supabase 환경변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.'
        );
      }
      _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabase as any)[prop as string];
  },
});
