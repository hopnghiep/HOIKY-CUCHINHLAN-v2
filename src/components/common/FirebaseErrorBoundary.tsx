import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { formatFirestoreUserMessage, getFirestoreUpgradeUrl } from '../../services/firestoreError';

interface State {
  hasError: boolean;
  errorMessage: string;
  isDailyReadQuota: boolean;
}

export class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isDailyReadQuota: false,
    };
  }

  static getDerivedStateFromError(error: unknown): State {
    const raw = error instanceof Error ? error.message : String(error);
    return {
      hasError: true,
      errorMessage: formatFirestoreUserMessage(error),
      isDailyReadQuota: raw.includes('Free daily read units per project (free tier database)'),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error('FirebaseErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#111113] text-[#F4F4F5] flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-3xl border border-[#F02028]/40 bg-[#171719] p-8 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F02028]/15 border border-[#F02028]/30 text-[#F02028]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-white">
                  Gián đoạn kết nối dữ liệu Firebase
                </h1>
                <p className="text-xs text-zinc-400">
                  Hồi ký Chi đoàn Cù Chính Lan
                </p>
              </div>
            </div>

            <p className="text-sm text-zinc-200 leading-relaxed break-words">
              {this.state.errorMessage}
            </p>

            {this.state.isDailyReadQuota && (
              <a
                href={getFirestoreUpgradeUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#242428] px-4 py-2.5 text-xs font-medium text-white hover:border-[#F02028]"
              >
                Mở bảng quản trị Firebase Firestore
              </a>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '', isDailyReadQuota: false })}
                className="inline-flex items-center gap-2 rounded-xl bg-[#F02028] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#d91b23] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Thử khôi phục giao diện
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/15 bg-[#242428] px-4 py-2.5 text-xs font-medium text-zinc-200 hover:bg-white/10 cursor-pointer"
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
