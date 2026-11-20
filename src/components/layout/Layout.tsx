import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  LogIn,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Redo2,
  Settings,
  Shield,
  Undo2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import type { ActiveTab } from '../../types/memoir';
import { AdminLoginModal } from '../modals/AdminLoginModal';
import { SettingsModal } from '../modals/SettingsModal';
import { HelpModal } from '../modals/HelpModal';

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    data,
    activeTab,
    setActiveTab,
    currentUser,
    isSignedIn,
    isAdmin,
    adminName,
    canUndo,
    canRedo,
    undo,
    redo,
    logoutAdmin,
    toasts,
    dismissToast,
  } = useMemoir();

  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [homeSubmenuOpen, setHomeSubmenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!homeSubmenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setHomeSubmenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHomeSubmenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [homeSubmenuOpen]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore if fullscreen is restricted by iframe permissions
    }
  };

  const homeSubmenuItems: { id: string; num: string; label: string }[] = [
    { id: 'home-hero', num: '00', label: 'Giới thiệu chung' },
    { id: 'home-analytics', num: 'KPI', label: 'Số liệu & Infographic lưu trữ' },
    { id: 'home-history', num: '01', label: data.home.history.sectionTitle || 'Lịch sử hình thành' },
    { id: 'home-meaning', num: '02', label: data.home.meaning.sectionTitle || 'Ý nghĩa và mục tiêu' },
    { id: 'home-milestones', num: '03', label: data.home.milestonesTitle || 'Mốc son và sự kiện quan trọng' },
    { id: 'home-anthem', num: '04', label: data.home.anthem.title || 'Hành khúc Chi đoàn' },
    {
      id: 'home-messages',
      num: '05',
      label: data.home.messagesTitle || 'Lời ngỏ của Hiệu trưởng và Các thế hệ lãnh đạo',
    },
  ];

  const scrollToHomeSection = (sectionId: string) => {
    setHomeSubmenuOpen(false);
    setMobileMenuOpen(false);
    const attemptScroll = (tries = 0) => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (tries < 20) {
        window.requestAnimationFrame(() => attemptScroll(tries + 1));
      }
    };
    if (activeTab !== 'home') {
      setActiveTab('home');
      window.requestAnimationFrame(() => attemptScroll(0));
    } else {
      attemptScroll(0);
    }
  };

  const membersOnlyCount = data.members.filter((m) => m.group === 'member').length;
  const guestsCount = data.members.filter((m) => m.group === 'guest_advisor').length;

  const navItems: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'home', label: 'Trang chủ' },
    { id: 'members', label: 'Thành viên', count: membersOnlyCount },
    { id: 'guests', label: 'Khách mời / Người có liên quan', count: guestsCount },
    { id: 'events', label: 'Sự kiện', count: data.events.length },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: 'Quản trị' });
  }

  return (
    <div className="min-h-screen flex flex-col theme-outer-shell transition-colors duration-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#171719]/95 backdrop-blur-md">
        {/* Row 1: Primary Navigation Links */}
        <div ref={navContainerRef} className="relative">
          <nav
            className="mx-auto flex max-w-[1440px] items-center gap-5 sm:gap-6 overflow-x-auto px-3 sm:px-6 lg:px-8"
            aria-label="Điều hướng chính"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const isHome = item.id === 'home';
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-expanded={isHome ? homeSubmenuOpen : undefined}
                  aria-haspopup={isHome ? 'menu' : undefined}
                  onClick={() => {
                    if (isHome) {
                      if (activeTab !== 'home') {
                        setActiveTab('home');
                        setHomeSubmenuOpen(true);
                      } else {
                        setHomeSubmenuOpen((prev) => !prev);
                      }
                    } else {
                      setHomeSubmenuOpen(false);
                      setActiveTab(item.id);
                    }
                  }}
                  className={`relative inline-flex items-center gap-1.5 py-3 text-xs sm:text-[13px] font-medium tracking-[0.04em] uppercase whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {isHome && (
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 ${
                        homeSubmenuOpen ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  )}
                  {typeof item.count === 'number' && (
                    <span className="ml-0.5 font-mono-num text-[11px] text-zinc-400">({item.count})</span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F02028]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick-jump submenu dropdown for Trang chủ */}
          {homeSubmenuOpen && (
            <div className="pointer-events-none absolute left-0 right-0 top-full z-50 pt-1.5">
              <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8">
                <div
                  role="menu"
                  aria-label="Danh mục xem nhanh Trang chủ"
                  className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/15 bg-[#171719]/98 p-2 shadow-2xl shadow-black/70 backdrop-blur-xl"
                >
                  <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400 border-b border-white/10 mb-1">
                    Xem nhanh nội dung Trang chủ
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {homeSubmenuItems.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        role="menuitem"
                        onClick={() => scrollToHomeSection(sub.id)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs sm:text-sm text-zinc-200 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        <span className="font-mono-num text-[11px] font-semibold text-[#F02028] shrink-0">
                          {sub.num}
                        </span>
                        <span className="truncate">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Row 2: Operational Toolbar + Primary Auth Action aligned to the left */}
        <div className="border-t border-white/5">
          <div className="mx-auto flex h-14 sm:h-16 max-w-[1440px] items-center justify-start gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <div className="hidden lg:flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  title="Hoàn tác (Undo)"
                  aria-label="Hoàn tác"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Hoàn tác</span>
                </button>

                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  title="Làm lại (Redo)"
                  aria-label="Làm lại"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Làm lại</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  title="Cài đặt"
                  aria-label="Cài đặt"
                  className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  title="Trợ giúp"
                  aria-label="Trợ giúp"
                  className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Thoát toàn màn hình' : 'Mở rộng toàn màn hình'}
                  aria-label={isFullscreen ? 'Thu gọn' : 'Mở rộng'}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  <span>{isFullscreen ? 'Thu gọn' : 'Mở rộng'}</span>
                </button>
              </div>

              {isSignedIn && currentUser ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => (isAdmin ? setActiveTab('admin') : setLoginOpen(true))}
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isAdmin
                        ? 'border-[#F02028]/40 bg-[#F02028]/15 hover:bg-[#F02028]/25'
                        : 'border-white/15 bg-[#242428] hover:bg-white/10'
                    }`}
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt=""
                        className="h-4 w-4 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : isAdmin ? (
                      <Shield className="w-3.5 h-3.5 text-[#F02028]" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-zinc-300" />
                    )}
                    <span className="max-w-[120px] truncate">{adminName || 'Tài khoản'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={logoutAdmin}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#242428] px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setLoginOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F02028] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng nhập</span>
                </button>
              )}

              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Thoát toàn màn hình' : 'Mở rộng toàn màn hình'}
                aria-label={isFullscreen ? 'Thu gọn' : 'Mở rộng'}
                className="lg:hidden inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span>{isFullscreen ? 'Thu gọn' : 'Mở rộng'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Mở menu điều hướng"
                className="ml-auto lg:hidden rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10 bg-[#171719] px-4 py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`rounded-lg px-3 py-2 text-xs font-medium cursor-pointer ${
                      isActive
                        ? 'bg-[#F02028] text-white'
                        : 'bg-[#242428] text-zinc-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {typeof item.count === 'number' ? ` (${item.count})` : ''}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#242428] px-3 py-2 text-xs text-zinc-200 disabled:opacity-40 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Hoàn tác
              </button>
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#242428] px-3 py-2 text-xs text-zinc-200 disabled:opacity-40 cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
                Làm lại
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#242428] px-3 py-2 text-xs text-zinc-200 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Toàn màn hình
              </button>
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#242428] px-3 py-2 text-xs text-zinc-200 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                Cài đặt
              </button>
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#242428] px-3 py-2 text-xs text-zinc-200 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Trợ giúp
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
        {children}
      </main>

      {/* Clean Editorial Footer */}
      <footer className="border-t border-white/10 bg-[#171719] mt-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="font-display text-sm sm:text-base font-semibold tracking-wide text-white">
              Hồi ký Điện tử Chi đoàn Cù Chính Lan
            </div>
            <p className="font-editorial-serif text-sm italic text-zinc-400 mt-1">
              Đoàn trường THPT Hoàng Hoa Thám – Quận Đoàn Bình Thạnh · Lưu trữ tư liệu nhiều thế hệ
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-400">
            {data.home.socialChannels.map((ch) => (
              <a
                key={ch.id}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                {ch.platform}: {ch.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-xl backdrop-blur-md ${
                toast.type === 'error'
                  ? 'border-[#F02028]/50 bg-[#1f1214]/95 text-red-100'
                  : toast.type === 'success'
                    ? 'border-emerald-500/40 bg-[#141d19]/95 text-emerald-100'
                    : 'border-white/15 bg-[#242428]/95 text-zinc-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#F02028]" />
                ) : (
                  <CheckCircle2
                    className={`w-4 h-4 shrink-0 ${
                      toast.type === 'success' ? 'text-emerald-400' : 'text-zinc-300'
                    }`}
                  />
                )}
                <span>{toast.text}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <AdminLoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
