import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // next reactStrictMode 為 true 時，run dev useEffect 會跑兩次
  reactStrictMode: false,
};

export default nextConfig;
