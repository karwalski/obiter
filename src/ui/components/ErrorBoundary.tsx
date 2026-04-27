/*
 * Obiter — AGLC4 Word Add-in
 * Copyright (C) 2026. Licensed under GPLv3.
 */

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import ErrorReporter from "./ErrorReporter";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback label used to identify which section crashed, for error reporting. */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  showReporter: boolean;
}

/**
 * React error boundary that catches rendering errors in child components
 * and displays a friendly fallback UI instead of a white screen.
 *
 * Provides:
 * - A user-friendly error message
 * - A collapsible "Technical details" section
 * - A "Refresh" button to reload the task pane
 * - A "Report this error" button to open the ErrorReporter modal
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDetails: false,
      showReporter: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for development debugging
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      errorInfo.componentStack,
    );
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleShowReporter = (): void => {
    this.setState({ showReporter: true });
  };

  handleCloseReporter = (): void => {
    this.setState({ showReporter: false });
  };

  handleToggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children;
    }

    const { error, showDetails, showReporter } = this.state;
    const label = this.props.label ?? "Unknown view";

    return (
      <div className="error-boundary">
        <div className="error-boundary-content">
          <h2 className="error-boundary-heading">Something went wrong</h2>
          <p className="error-boundary-message">
            An unexpected error occurred. Try refreshing the page. If the problem
            persists, you can report this error to help us fix it.
          </p>

          <div className="error-boundary-actions">
            <button
              className="error-boundary-btn error-boundary-btn-primary"
              onClick={this.handleRefresh}
            >
              Refresh
            </button>
            <button
              className="error-boundary-btn"
              onClick={this.handleShowReporter}
            >
              Report this error
            </button>
          </div>

          <button
            className="error-boundary-details-toggle"
            onClick={this.handleToggleDetails}
            aria-expanded={showDetails}
          >
            Technical details {showDetails ? "\u25B2" : "\u25BC"}
          </button>

          {showDetails && (
            <pre className="error-boundary-details">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}
        </div>

        {showReporter && (
          <ErrorReporter
            error={error}
            action={label}
            onClose={this.handleCloseReporter}
          />
        )}
      </div>
    );
  }
}
