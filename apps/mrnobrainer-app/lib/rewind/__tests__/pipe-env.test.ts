import { describe, expect, it } from "vitest";

import { getPipeEnvStatusFromText } from "@/lib/rewind/pipe-env";

describe("pipe env status", () => {
  it("treats the shipped template values as not configured", () => {
    const status = getPipeEnvStatusFromText(`NOTION_API_KEY=secret_xxx\nNOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n`);

    expect(status.notionConfigured).toBe(false);
    expect(status.hasApiKey).toBe(false);
    expect(status.hasDatabaseId).toBe(false);
  });

  it("treats real notion credentials as configured", () => {
    const status = getPipeEnvStatusFromText(`NOTION_API_KEY=secret_live_123\nNOTION_DATABASE_ID=abc123database\nUSER_ID=owen\n`);

    expect(status).toEqual({
      notionConfigured: true,
      hasApiKey: true,
      hasDatabaseId: true,
    });
  });
});
