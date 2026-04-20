import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    images: {
        unoptimized: true,
    },
    eslint: {
        // Disable eslint during builds - we run it separately in CI
        ignoreDuringBuilds: true,
    },
    webpack: (config, { dev }) => {
        if (dev) {
            config.resolve = config.resolve || {};
            config.resolve.alias = {
                ...(config.resolve.alias || {}),
                'posthog-js$': path.join(projectRoot, 'lib/shims/posthog-js.ts'),
                'posthog-js/react$': path.join(projectRoot, 'lib/shims/posthog-react.tsx'),
            };
        }
        return config;
    },
}
export default nextConfig;
