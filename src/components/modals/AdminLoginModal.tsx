import React, { useState } from 'react';
import { CheckCircle2, Cloud, LogOut, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminLoginModal({ isOpen, onClose }: AdminLoginModalProps) {
  const { currentUser, isAdmin, signInWithGoogle, logoutAdmin } = useMemoir();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    const res = await signInWithGoogle();
    setSubmitting(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error || 'Không thể đăng nhập bằng Google.');
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    await logoutAdmin();
    setSubmitting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="firebase-auth-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#171719] p-6 shadow-2xl space-y-5">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng đăng nhập"
          className="absolute right-4 top-4 rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F02028]/15 border border-[#F02028]/30 text-[#F02028]">
            {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
          </div>
          <div>
            <h2 id="firebase-auth-title" className="text-xl font-semibold text-white">
              {currentUser ? 'Tài khoản Firebase' : 'Đăng nhập bằng Google'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {currentUser
                ? 'Đang kết nối xác thực Firebase & đồng bộ Cloud Firestore.'
                : 'Xác thực an toàn qua Google để đồng bộ trực tuyến dữ liệu Hồi ký.'}
            </p>
          </div>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#242428] p-4 flex items-center gap-3.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Avatar'}
                  className="h-12 w-12 rounded-full border border-white/15 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#171719] border border-white/15 text-zinc-300">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white truncate">
                  {currentUser.displayName || 'Thành viên Chi đoàn'}
                </div>
                <div className="text-xs text-zinc-400 truncate">{currentUser.email}</div>
                <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAdmin ? 'Quản trị viên (Toàn quyền biên tập)' : 'Thành viên (Đồng bộ & Hồ sơ cá nhân)'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#242428]/60 px-3.5 py-2.5 text-xs text-zinc-400">
              <div className="text-[11px] text-zinc-500">Firebase UID của bạn</div>
              <div className="font-mono-num text-zinc-200 break-all mt-0.5 select-all">{currentUser.uid}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#F02028] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d91b23] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#242428] p-4 space-y-2 text-xs text-zinc-300 leading-relaxed">
              <div className="font-semibold text-white">Quyền lợi khi đăng nhập Google:</div>
              <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                <li>Đồng bộ dữ liệu Hồi ký thời gian thực từ cơ sở dữ liệu Cloud Firestore.</li>
                <li>Tạo và tự cập nhật hồ sơ cá nhân, ảnh hoạt động, bài viết chia sẻ của riêng bạn.</li>
                <li>Thông tin liên hệ riêng tư (điện thoại, email, Zalo) được bảo vệ nghiêm ngặt theo quyền sở hữu.</li>
                <li>Tài khoản Quản trị viên tự động kích hoạt chế độ chỉnh sửa trực tiếp và Admin Console.</li>
              </ul>
            </div>

            {error && (
              <div className="rounded-xl border border-[#F02028]/50 bg-[#F02028]/10 px-3.5 py-2.5 text-xs text-red-200">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#F02028] px-5 py-3 text-sm font-semibold text-white hover:bg-[#d91b23] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.47-1.71 4.31-5.27 4.31-3.17 0-5.76-2.63-5.76-5.89s2.59-5.89 5.76-5.89c1.81 0 3.02.77 3.71 1.43l2.53-2.44C16.79 4.07 14.69 3.1 12.17 3.1 7.21 3.1 3.2 7.11 3.2 12.5s4.01 9.4 8.97 9.4c5.18 0 8.61-3.64 8.61-8.77 0-.59-.07-1.04-.17-1.53z"
                />
              </svg>
              <span>{submitting ? 'Đang mở cửa sổ đăng nhập Google...' : 'Tiếp tục với tài khoản Google'}</span>
            </button>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-white/15 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
