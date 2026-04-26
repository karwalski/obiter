/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 *
 * Corpus Download Banner (Story 17.8)
 *
 * Non-modal banner displayed at the top of the task pane when the
 * Australian Legal Corpus index has not been downloaded. Offers the
 * user three options: download, use online only, or dismiss.
 *
 * Only shown once per session (not on every tab switch).
 */

import { useState, useCallback } from "react";
import {
  downloadCorpusIndex,
  skipCorpus,
} from "../../api/corpus/corpusDownload";
import { setCloudMode } from "../../api/cloud/cloudMode";
import {
  dismissCorpusBanner,
  registerCorpusAfterDownload,
} from "../../api/initializeAdapters";

export interface CorpusDownloadBannerProps {
  /** Called after the banner is dismissed or action is taken. */
  onDismiss: () => void;
}

type BannerState = "prompt" | "downloading" | "done" | "error";

export default function CorpusDownloadBanner({
  onDismiss,
}: CorpusDownloadBannerProps): JSX.Element | null {
  const [state, setState] = useState<BannerState>("prompt");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const handleDownload = useCallback(async () => {
    setState("downloading");
    try {
      await downloadCorpusIndex((loaded, totalEntries) => {
        setProgress(loaded);
        setTotal(totalEntries);
      });
      registerCorpusAfterDownload();
      setState("done");
      // Auto-dismiss after a short delay
      setTimeout(() => {
        dismissCorpusBanner();
        onDismiss();
      }, 1500);
    } catch {
      setState("error");
    }
  }, [onDismiss]);

  const handleUseOnlineOnly = useCallback(() => {
    skipCorpus();
    setCloudMode("cloud-only");
    dismissCorpusBanner();
    onDismiss();
  }, [onDismiss]);

  const handleDismissClick = useCallback(() => {
    dismissCorpusBanner();
    onDismiss();
  }, [onDismiss]);

  if (state === "done") {
    return (
      <div className="obiter-corpus-banner obiter-corpus-banner--success" role="status">
        <p className="obiter-corpus-banner__text">
          Corpus index loaded successfully.
        </p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="obiter-corpus-banner obiter-corpus-banner--error" role="alert">
        <p className="obiter-corpus-banner__text">
          Corpus download failed. You can try again later from Settings.
        </p>
        <div className="obiter-corpus-banner__actions">
          <button
            type="button"
            className="obiter-corpus-banner__btn obiter-corpus-banner__btn--secondary"
            onClick={handleDismissClick}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  if (state === "downloading") {
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
    return (
      <div className="obiter-corpus-banner obiter-corpus-banner--downloading" role="status">
        <p className="obiter-corpus-banner__text">
          Downloading corpus index...
        </p>
        <div className="obiter-corpus-banner__progress-track">
          <div
            className="obiter-corpus-banner__progress-fill"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="obiter-corpus-banner__pct">{pct}%</span>
      </div>
    );
  }

  // Default: prompt state
  return (
    <div className="obiter-corpus-banner" role="region" aria-label="Corpus download">
      <p className="obiter-corpus-banner__text">
        Download the Australian Legal Corpus for offline citation lookup (~500 MB).
        You can also use online sources only.
      </p>
      <div className="obiter-corpus-banner__actions">
        <button
          type="button"
          className="obiter-corpus-banner__btn obiter-corpus-banner__btn--primary"
          onClick={() => void handleDownload()}
        >
          Download
        </button>
        <button
          type="button"
          className="obiter-corpus-banner__btn obiter-corpus-banner__btn--secondary"
          onClick={handleUseOnlineOnly}
        >
          Use Online Only
        </button>
        <button
          type="button"
          className="obiter-corpus-banner__btn obiter-corpus-banner__btn--ghost"
          onClick={handleDismissClick}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
