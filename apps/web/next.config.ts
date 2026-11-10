import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const config: NextConfig = {
  outputFileTracingRoot: fileURLToPath(new URL("../..", import.meta.url)),
  outputFileTracingIncludes: {"/api/*":["../../paypal-plan.md","../../apps/fixtures/bramble/*.ts","../../apps/fixtures/bramble/paypal-plan.md","../../docs/evidence/*.json"]},
  turbopack: {root:fileURLToPath(new URL("../..", import.meta.url))},
  serverExternalPackages: ["pg", "better-sqlite3", "paypal", "@paypal/agent-toolkit"],
  poweredByHeader: false,
  async headers() {
    return [{source:"/(.*)", headers:[
      {key:"X-Content-Type-Options",value:"nosniff"},
      {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
      {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
    ]}];
  }
};
export default config;
