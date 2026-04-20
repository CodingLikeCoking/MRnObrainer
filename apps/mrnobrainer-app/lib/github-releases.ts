"use client";

import type { UpdateChannel } from "@/lib/hooks/use-settings";
import {
  PRODUCT_LEGACY_REPO,
  PRODUCT_REPO,
  PRODUCT_REPO_URL,
  PRODUCT_RELEASES_URL,
} from "@/lib/product-config";

export const MRNOBRAINER_GITHUB_REPO = PRODUCT_REPO;
export const MRNOBRAINER_LEGACY_GITHUB_REPO = PRODUCT_LEGACY_REPO;
export const MRNOBRAINER_GITHUB_REPO_URL = PRODUCT_REPO_URL;
export const MRNOBRAINER_RELEASES_URL = PRODUCT_RELEASES_URL;
export const MRNOBRAINER_GITHUB_ISSUES_URL = `${MRNOBRAINER_GITHUB_REPO_URL}/issues`;
export const MRNOBRAINER_GITHUB_DISCUSSIONS_URL = `${MRNOBRAINER_GITHUB_REPO_URL}/discussions`;
export const MRNOBRAINER_GITHUB_README_URL = `${MRNOBRAINER_GITHUB_REPO_URL}#readme`;

export interface GithubReleaseInfo {
  version: string;
  body: string;
  htmlUrl: string;
  prerelease: boolean;
  publishedAt: string;
  name: string;
}

interface GithubReleaseResponse {
  tag_name: string;
  body: string | null;
  html_url: string;
  prerelease: boolean;
  published_at: string;
  name: string | null;
}

const RELEASE_REPO_CANDIDATES = [
  MRNOBRAINER_GITHUB_REPO,
  MRNOBRAINER_LEGACY_GITHUB_REPO,
];

function normalizeVersion(version: string) {
  return version.replace(/^v/i, "").trim();
}

export function compareSemver(a: string, b: string) {
  const left = normalizeVersion(a).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(b).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const max = Math.max(left.length, right.length);

  for (let index = 0; index < max; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

export function isReleaseNewer(latestVersion: string, currentVersion: string) {
  return compareSemver(latestVersion, currentVersion) > 0;
}

function toReleaseInfo(release: GithubReleaseResponse): GithubReleaseInfo {
  return {
    version: normalizeVersion(release.tag_name),
    body: release.body || "",
    htmlUrl: release.html_url,
    prerelease: release.prerelease,
    publishedAt: release.published_at,
    name: release.name || normalizeVersion(release.tag_name),
  };
}

export async function fetchGithubReleases() {
  let lastError: Error | null = null;

  for (const repo of RELEASE_REPO_CANDIDATES) {
    const response = await fetch(`https://api.github.com/repos/${repo}/releases`, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (response.ok) {
      const releases = (await response.json()) as GithubReleaseResponse[];
      return releases.map(toReleaseInfo);
    }

    if (response.status !== 404) {
      lastError = new Error(`release downloads returned ${response.status} for ${repo}`);
      break;
    }
  }

  throw lastError || new Error("release downloads were not found for MRnObrainer");
}

export async function fetchLatestGithubRelease(channel: UpdateChannel = "stable") {
  const releases = await fetchGithubReleases();

  const matchingRelease = releases.find((release) =>
    channel === "beta" ? release.prerelease : !release.prerelease
  );

  return matchingRelease || null;
}
