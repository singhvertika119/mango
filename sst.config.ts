/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "mango",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    const nextjsApp = new sst.aws.Nextjs("MangoWeb", {
      architecture: "arm64", // Graviton2 ARM64 for faster performance and lower Free Tier GB-sec consumption
      memory: "512 MB",
      timeout: "30 seconds",
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        GROQ_API_KEY: process.env.GROQ_API_KEY || "",
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "",
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || "",
        GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || "",
      },
    });

    return {
      url: nextjsApp.url,
    };
  },
});
