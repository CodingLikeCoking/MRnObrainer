import { open } from "@tauri-apps/plugin-shell";

import type { UpdateChannel } from "@/lib/hooks/use-settings";
import {
  fetchLatestGithubRelease,
} from "@/lib/github-releases";
import {
  MANUAL_DOWNLOADS_URL,
  getManualUpdateCheckTitle,
  getManualUpdateFailureTitle,
  getManualUpdateMissingDescription,
  getManualUpdateOpenDescription,
} from "@/lib/manual-update-copy";

export async function checkForAppUpdates({
  toast,
  channel = "stable",
}: {
  toast: any;
  channel?: UpdateChannel;
}) {
  const checkingToastId = toast({
    title: getManualUpdateCheckTitle(),
    description: `checking the ${channel} channel`,
    duration: Infinity,
  });

  try {
    const latestRelease = await fetchLatestGithubRelease(channel);

    if (!latestRelease) {
      toast({
        id: checkingToastId,
        title: "no release found",
        description: getManualUpdateMissingDescription(),
        duration: 4000,
      });
      return null;
    }

    toast({
      id: checkingToastId,
      title: `v${latestRelease.version} available`,
      description: getManualUpdateOpenDescription(),
      duration: 2500,
    });

    await open(latestRelease.htmlUrl || MANUAL_DOWNLOADS_URL);
    return latestRelease;
  } catch (error) {
    toast({
      id: checkingToastId,
      title: getManualUpdateFailureTitle(),
      description: String(error),
      variant: "destructive",
      duration: 5000,
    });
    return null;
  }
}
