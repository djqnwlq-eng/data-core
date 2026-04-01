import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API 라우트는 항상 서버에서 실행 (빌드 시 정적 생성 안 함)
  serverExternalPackages: [],
};

export default nextConfig;
