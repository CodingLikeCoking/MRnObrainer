import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  PaperclipOfficeSnapshot,
  RewindPaperclipSettings,
} from "@/lib/rewind/home-model";
import {
  PaperclipApiError,
  PaperclipClient,
  type PaperclipActionPayload,
  type PaperclipIssuePatch,
} from "@/lib/rewind/paperclip-client";

type UsePaperclipOfficeOptions = {
  settings: RewindPaperclipSettings;
  active: boolean;
};

type PaperclipMutationResult = {
  ok: boolean;
  error?: string;
};

function clampPollInterval(value: number, minimum: number, fallback: number) {
  const normalized = Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.max(minimum, normalized || fallback);
}

export function usePaperclipOffice({ settings, active }: UsePaperclipOfficeOptions) {
  const [snapshot, setSnapshot] = useState<PaperclipOfficeSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const client = useMemo(() => new PaperclipClient(settings), [settings]);

  const refresh = useCallback(async () => {
    if (!client.isConfigured() || !settings.enabled) {
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      const nextSnapshot = await client.fetchOfficeSnapshot();
      setSnapshot(nextSnapshot);
      setError(nextSnapshot.admin.errorMessage || null);
      return nextSnapshot;
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Failed to load Paperclip office";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client, settings.enabled]);

  useEffect(() => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!client.isConfigured() || !settings.enabled) {
      setSnapshot(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    void refresh();

    const intervalMs =
      clampPollInterval(
        active ? settings.pollIntervalSec : settings.backgroundPollIntervalSec,
        active ? 5 : 10,
        active ? 5 : 20
      ) * 1000;
    pollingRef.current = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [
    active,
    client,
    refresh,
    settings.backgroundPollIntervalSec,
    settings.enabled,
    settings.pollIntervalSec,
  ]);

  const mutate = useCallback(
    async (action: () => Promise<unknown>): Promise<PaperclipMutationResult> => {
      try {
        await action();
        await refresh();
        return { ok: true };
      } catch (nextError) {
        const message =
          nextError instanceof PaperclipApiError || nextError instanceof Error
            ? nextError.message
            : "Paperclip action failed";
        setError(message);
        return { ok: false, error: message };
      }
    },
    [refresh]
  );

  return {
    snapshot,
    isLoading,
    error,
    configured: client.isConfigured() && settings.enabled,
    refresh,
    pauseAgent: (agentId: string) => mutate(() => client.pauseAgent(agentId)),
    resumeAgent: (agentId: string) => mutate(() => client.resumeAgent(agentId)),
    invokeHeartbeat: (agentId: string) => mutate(() => client.invokeHeartbeat(agentId)),
    wakeupAgent: (agentId: string, payload?: PaperclipActionPayload) =>
      mutate(() => client.wakeupAgent(agentId, payload)),
    createAgent: (payload: Record<string, unknown>) => mutate(() => client.createAgent(payload)),
    hireAgent: (payload: Record<string, unknown>) => mutate(() => client.hireAgent(payload)),
    updateAgent: (agentId: string, payload: Record<string, unknown>) =>
      mutate(() => client.updateAgent(agentId, payload)),
    createIssue: (payload: Record<string, unknown>) => mutate(() => client.createIssue(payload)),
    updateIssue: (issueId: string, payload: PaperclipIssuePatch) =>
      mutate(() => client.updateIssue(issueId, payload)),
    addIssueComment: (issueId: string, body: string) =>
      mutate(() => client.addIssueComment(issueId, body)),
    checkoutIssue: (issueId: string, agentId: string) =>
      mutate(() => client.checkoutIssue(issueId, agentId)),
    releaseIssue: (issueId: string) => mutate(() => client.releaseIssue(issueId)),
    approveApproval: (approvalId: string, decisionNote: string) =>
      mutate(() => client.approveApproval(approvalId, decisionNote)),
    rejectApproval: (approvalId: string, decisionNote: string) =>
      mutate(() => client.rejectApproval(approvalId, decisionNote)),
    requestApprovalRevision: (approvalId: string, decisionNote: string) =>
      mutate(() => client.requestApprovalRevision(approvalId, decisionNote)),
    resubmitApproval: (approvalId: string, payload: Record<string, unknown>) =>
      mutate(() => client.resubmitApproval(approvalId, payload)),
  };
}
