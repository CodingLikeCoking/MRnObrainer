import { describe, expect, it } from "vitest";
import { getPostHogConfig, sanitizeSensitiveUrl } from "../oss-public";

describe("getPostHogConfig", () => {
  it("returns null when no public posthog key is configured", () => {
    expect(getPostHogConfig({})).toBeNull();
  });

  it("uses the configured host when present", () => {
    expect(
      getPostHogConfig({
        NEXT_PUBLIC_POSTHOG_KEY: "phc_test_key",
        NEXT_PUBLIC_POSTHOG_HOST: "https://example.com",
      })
    ).toEqual({
      key: "phc_test_key",
      host: "https://example.com",
    });
  });
});

describe("sanitizeSensitiveUrl", () => {
  it("redacts sensitive query params", () => {
    expect(
      sanitizeSensitiveUrl(
        "screenpipe://auth?api_key=abc123&token=secret&foo=bar"
      )
    ).toBe("screenpipe://auth?api_key=%5BREDACTED%5D&token=%5BREDACTED%5D&foo=bar");
  });

  it("leaves non-urls unchanged", () => {
    expect(sanitizeSensitiveUrl("not-a-url")).toBe("not-a-url");
  });
});
