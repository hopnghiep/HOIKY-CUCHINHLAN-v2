/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MemoirProvider, useMemoir } from './context/MemoirContext';
import { Layout } from './components/layout/Layout';
import { HomeView } from './components/home/HomeView';
import { MembersView } from './components/members/MembersView';
import { EventsView } from './components/events/EventsView';
import { AdminConsoleView } from './components/admin/AdminConsoleView';
import { FirebaseErrorBoundary } from './components/common/FirebaseErrorBoundary';

function MemoirRouter() {
  const { activeTab, isLoading } = useMemoir();

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#171719] p-12 text-center space-y-3">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#F02028] border-t-transparent" />
        <p className="text-sm text-zinc-300">Đang tải không gian Hồi ký Chi đoàn Cù Chính Lan...</p>
      </div>
    );
  }

  switch (activeTab) {
    case 'members':
      return <MembersView />;
    case 'events':
      return <EventsView />;
    case 'admin':
      return <AdminConsoleView />;
    case 'home':
    default:
      return <HomeView />;
  }
}

export default function App() {
  return (
    <FirebaseErrorBoundary>
      <MemoirProvider>
        <Layout>
          <MemoirRouter />
        </Layout>
      </MemoirProvider>
    </FirebaseErrorBoundary>
  );
}
