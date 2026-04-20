import { defaultUrlTransform } from "react-markdown";

export type ChatDeepLinkTarget =
  | { kind: "frame"; frameId: string }
  | { kind: "timeline"; timestamp: string };

const SUPPORTED_CHAT_DEEP_LINK_SCHEMES = ["mrnobrainer://", "screenpipe://"] as const;

function hasSupportedChatDeepLinkScheme(href: string): boolean {
  return SUPPORTED_CHAT_DEEP_LINK_SCHEMES.some((scheme) => href.startsWith(scheme));
}

export function parseChatDeepLinkTarget(href?: string | null): ChatDeepLinkTarget | null {
  if (!href || !hasSupportedChatDeepLinkScheme(href)) {
    return null;
  }

  if (href.includes("://frame")) {
    const frameId = href.split("frame/")[1]?.replace(/^\//, "");
    return frameId ? { kind: "frame", frameId } : null;
  }

  if (!href.includes("://timeline")) {
    return null;
  }

  const url = new URL(href);
  const timestamp =
    url.searchParams.get("timestamp") ?? url.searchParams.get("start_time");

  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : { kind: "timeline", timestamp };
}

export function isChatDeepLink(href?: string | null): boolean {
  return parseChatDeepLinkTarget(href) !== null;
}

export function preserveAllowedChatDeepLinks(href: string): string {
  return hasSupportedChatDeepLinkScheme(href) ? href : defaultUrlTransform(href);
}
