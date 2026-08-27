import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지용 최소 실행 번들(.next/standalone) 생성
  output: "standalone",
};

export default nextConfig;
