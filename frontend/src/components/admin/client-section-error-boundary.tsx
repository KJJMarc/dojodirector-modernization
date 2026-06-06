"use client";

import { Component, type ReactNode } from "react";

interface ClientSectionErrorBoundaryProps {
  sectionLabel: string;
  children: ReactNode;
}

interface ClientSectionErrorBoundaryState {
  error: Error | null;
}

export class ClientSectionErrorBoundary extends Component<
  ClientSectionErrorBoundaryProps,
  ClientSectionErrorBoundaryState
> {
  state: ClientSectionErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error(
      `[RecurringScheduleBookings:${this.props.sectionLabel}]`,
      error,
      errorInfo.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      return (
        <section className="rounded-xl border border-dojo-red/40 bg-dojo-red/10 p-4">
          <p className="text-sm text-dojo-red">
            Unable to load {this.props.sectionLabel}. Please refresh the page.
          </p>
        </section>
      );
    }

    return this.props.children;
  }
}
