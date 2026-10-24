import { Component, type ReactNode } from "react";

/**
 * The shell's safety net. Until this existed, any page that threw during
 * render unmounted the whole app to a white screen -- which is what
 * "switching pages crashes the app" looked like from a learner's seat,
 * for something as small as one component touching blocked storage.
 *
 * A failed page now lands here: what happened in plain words, one button
 * that reloads, one that goes home. App.tsx keys this boundary by
 * pathname, so navigating away always starts from a clean boundary.
 */
interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Keep the fact, not the payload: an error message can quote learner data.
    console.error("page error:", (error as Error)?.name ?? "unknown");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-[70vh] place-items-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[#0D2B55]">This page hit a problem</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Something went wrong loading this screen. Your account and saved progress are
            safe — reloading usually fixes it.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#0D2B55] px-4 py-2 text-sm font-medium text-white hover:bg-[#123a73]"
            >
              Reload page
            </button>
            <a
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-[#0D2B55] hover:bg-slate-50"
            >
              Go to home page
            </a>
          </div>
        </div>
      </main>
    );
  }
}
