/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	transpilePackages: ["@blueflame/shared"],
};

export default nextConfig;
