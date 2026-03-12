import { open } from "@tauri-apps/plugin-shell";

import type { UpdateChannel } from "@/lib/hooks/use-settings";
import {
  fetchLatestGithubRelease,
  MRNOBRAINER_RELEASES_URL,
} from "@/lib/github-releases";

export async function checkForAppUpdates({
  toast,
  channel = "stable",
}: {
  toast: any;
  channel?: UpdateChannel;
}) {
  const checkingToastId = toast({
    title: "checking GitHub releases...",
    description: `checking the ${channel} channel`,
    duration: Infinity,
  });

  try {
    const latestRelease = await fetchLatestGithubRelease(channel);

    if (!latestRelease) {
      toast({
        id: checkingToastId,
        title: "no release found",
        description: "no matching GitHub Release is available yet",
        duration: 4000,
      });
      return null;
    }

    toast({
      id: checkingToastId,
      title: `v${latestRelease.version} available`,
      description: "opening GitHub Releases",
      duration: 2500,
    });

    await open(latestRelease.htmlUrl || MRNOBRAINER_RELEASES_URL);
    return latestRelease;
  } catch (error) {
    toast({
      id: checkingToastId,
      title: "release check failed",
      description: String(error),
      variant: "destructive",
      duration: 5000,
    });
    return null;
  }
}
