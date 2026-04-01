# Data Core - 설정 가이드

## 1. Supabase 설정

### 1-1. 프로젝트 생성
1. https://supabase.com 에서 계정 생성/로그인
2. "New Project" 클릭
3. 프로젝트 이름: `data-core`
4. 비밀번호 설정 (기억해두세요)
5. Region: `Northeast Asia (Tokyo)` 선택 (한국에서 가장 빠름)

### 1-2. 데이터베이스 설정
1. 좌측 메뉴 "SQL Editor" 클릭
2. `supabase/schema.sql` 파일의 전체 내용을 복사하여 붙여넣기
3. "Run" 클릭하여 실행
4. 모든 테이블과 함수가 생성됩니다

### 1-3. API 키 확인
1. 좌측 메뉴 "Settings" → "API"
2. "Project URL" 복사 → `NEXT_PUBLIC_SUPABASE_URL`
3. "anon public" 키 복사 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Google Gemini API 설정

### 2-1. API 키 발급
1. https://aistudio.google.com/apikey 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. API 키 복사 → `GEMINI_API_KEY`

## 3. 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 생성합니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
GEMINI_API_KEY=AIzaSy...
```

## 4. 실행

```bash
# 개발 서버 실행
npm run dev

# 브라우저에서 열기
# http://localhost:3000
```

## 5. Vercel 배포 (웹 배포)

### 5-1. GitHub에 코드 올리기
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/data-core.git
git push -u origin main
```

### 5-2. Vercel 배포
1. https://vercel.com 에서 GitHub 계정으로 로그인
2. "Import Project" → GitHub 레포 선택
3. "Environment Variables"에 위 3개 환경변수 추가
4. "Deploy" 클릭
5. 배포 완료 후 URL이 생성됩니다 (예: data-core.vercel.app)

## 6. 팀원 계정 설정

Supabase Authentication으로 팀원 계정을 관리합니다:
1. Supabase Dashboard → "Authentication" → "Users"
2. "Add user" → "Create new user"
3. 각 팀원의 이메일/비밀번호 등록 (4명)

현재 버전에서는 인증 없이 사용 가능합니다.
팀원 인증이 필요하면 추후 로그인 기능을 추가할 수 있습니다.
