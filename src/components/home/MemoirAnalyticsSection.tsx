import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  FileText,
  Images,
  Layers,
  Users,
} from 'lucide-react';
import { useMemoir } from '../../context/MemoirContext';
import { computeMemoirStats } from '../../services/backupService';

export function MemoirAnalyticsSection() {
  const { data, setActiveTab } = useMemoir();
  const [hoveredArchiveKey, setHoveredArchiveKey] = useState<string | null>(null);
  const [selectedCohortKey, setSelectedCohortKey] = useState<string | null>(null);

  const stats = useMemo(() => computeMemoirStats(data), [data]);

  const cohortsSorted = useMemo(
    () => [...(data.cohorts || [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [data.cohorts]
  );

  // Real distribution of profiles across cohorts
  const cohortBreakdown = useMemo(() => {
    const cohortIds = new Set(cohortsSorted.map((c) => c.id));
    const rows = cohortsSorted.map((c) => {
      const assigned = data.members.filter((m) => m.cohortId === c.id);
      const memberCount = assigned.filter((m) => m.group === 'member').length;
      const guestCount = assigned.filter((m) => m.group === 'guest_advisor').length;
      return {
        key: c.id,
        name: c.name,
        period: c.period || 'Đang cập nhật',
        total: assigned.length,
        memberCount,
        guestCount,
        linkedEvents: c.linkedEventIds?.length || 0,
        linkedMilestones: c.linkedMilestoneIds?.length || 0,
      };
    });

    const unassigned = data.members.filter((m) => !m.cohortId || !cohortIds.has(m.cohortId));
    if (unassigned.length > 0) {
      rows.push({
        key: '__unassigned__',
        name: 'Chưa phân niên khóa',
        period: 'Hồ sơ chung',
        total: unassigned.length,
        memberCount: unassigned.filter((m) => m.group === 'member').length,
        guestCount: unassigned.filter((m) => m.group === 'guest_advisor').length,
        linkedEvents: 0,
        linkedMilestones: 0,
      });
    }
    return rows;
  }, [cohortsSorted, data.members]);

  const maxCohortCount = useMemo(
    () => Math.max(1, ...cohortBreakdown.map((r) => r.total)),
    [cohortBreakdown]
  );

  // Real archive composition for vertical column chart
  const archiveSeries = useMemo(
    () => [
      { key: 'members', label: 'Đoàn viên', value: stats.membersCount, tone: '#0087FF' },
      { key: 'guests', label: 'Khách mời', value: stats.guestsCount, tone: '#002F69' },
      { key: 'events', label: 'Sự kiện', value: stats.eventsCount, tone: '#0087FF' },
      { key: 'milestones', label: 'Mốc son', value: data.milestones.length, tone: '#4A6B93' },
      { key: 'messages', label: 'Lời ngỏ', value: data.leaderMessages.length, tone: '#002F69' },
      { key: 'articles', label: 'Bài viết', value: stats.articlesCount, tone: '#4A6B93' },
    ],
    [data.leaderMessages.length, data.milestones.length, stats]
  );

  const maxArchiveValue = useMemo(
    () => Math.max(1, ...archiveSeries.map((item) => item.value)),
    [archiveSeries]
  );

  // Real profile digitization completeness metrics (zero fabricated numbers)
  const completenessMetrics = useMemo(() => {
    const totalProfiles = data.members.length;
    if (totalProfiles === 0) {
      return [
        { label: 'Chân dung thời trẻ', count: 0, total: 0, pct: 0 },
        { label: 'Chân dung hiện tại', count: 0, total: 0, pct: 0 },
        { label: 'Tiểu sử & Giới thiệu', count: 0, total: 0, pct: 0 },
        { label: 'Ảnh hoạt động / Bài viết', count: 0, total: 0, pct: 0 },
      ];
    }
    const withYouthPhoto = data.members.filter((m) => Boolean(m.youthPhoto?.trim())).length;
    const withPresentPhoto = data.members.filter((m) => Boolean(m.presentPhoto?.trim())).length;
    const withBio = data.members.filter(
      (m) => Boolean(m.biography?.trim()) || Boolean(m.selfIntro?.trim())
    ).length;
    const withMediaOrArticle = data.members.filter(
      (m) => (m.activityPhotos?.length || 0) > 0 || (m.articles?.length || 0) > 0
    ).length;

    const toPct = (n: number) => Math.round((n / totalProfiles) * 100);
    return [
      { label: 'Chân dung thời trẻ', count: withYouthPhoto, total: totalProfiles, pct: toPct(withYouthPhoto) },
      { label: 'Chân dung hiện tại', count: withPresentPhoto, total: totalProfiles, pct: toPct(withPresentPhoto) },
      { label: 'Tiểu sử & Giới thiệu', count: withBio, total: totalProfiles, pct: toPct(withBio) },
      {
        label: 'Ảnh hoạt động / Bài viết',
        count: withMediaOrArticle,
        total: totalProfiles,
        pct: toPct(withMediaOrArticle),
      },
    ];
  }, [data.members]);

  const kpiCards = [
    {
      label: 'Đoàn viên Chi đoàn',
      value: stats.membersCount,
      sub: `${cohortsSorted.length} niên khóa đã thiết lập`,
      icon: Users,
      onClick: () => setActiveTab('members'),
    },
    {
      label: 'Khách mời & Cố vấn',
      value: stats.guestsCount,
      sub: 'Thầy cô, lãnh đạo & người liên quan',
      icon: Layers,
      onClick: () => setActiveTab('guests'),
    },
    {
      label: 'Sự kiện & Mốc son',
      value: stats.eventsCount + data.milestones.length,
      sub: `${stats.eventsCount} sự kiện · ${data.milestones.length} mốc son`,
      icon: Calendar,
      onClick: () => setActiveTab('events'),
    },
    {
      label: 'Tư liệu Ảnh & Bài viết',
      value: stats.imagesCount,
      sub: `${stats.imagesCount} hình ảnh · ${stats.articlesCount} bài viết`,
      icon: Images,
      onClick: () => setActiveTab('members'),
    },
  ];

  const activeArchiveItem = archiveSeries.find((s) => s.key === hoveredArchiveKey) || null;

  return (
    <section
      id="home-analytics"
      aria-labelledby="home-analytics-heading"
      className="corp-white-band editorial-cream-sheet scroll-mt-32 rounded-3xl border border-white/10 bg-[#171719] p-6 sm:p-10 lg:p-12 space-y-8"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#F02028]">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Tổng quan dữ liệu thực tế · Infographic Lưu trữ</span>
          </div>
          <h2
            id="home-analytics-heading"
            className="font-display editorial-section-title text-2xl sm:text-3xl font-bold text-white"
          >
            Bức tranh số hóa Tư liệu Chi đoàn
          </h2>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Thống kê trực quan theo thời gian thực từ cơ sở dữ liệu hồ sơ đoàn viên, niên khóa, mốc son lịch sử và kho
            tư liệu hình ảnh đang lưu trữ trong ứng dụng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg bg-[#F02028] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d91b23] transition-colors cursor-pointer"
        >
          <span>Khám phá hồ sơ thành viên</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Structured KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="group text-left rounded-xl border border-white/10 bg-[#242428] p-5 transition-all duration-200 hover:border-[#F02028] cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.04em] text-zinc-400">
                  {card.label}
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F02028]/10 text-[#F02028] transition-colors group-hover:bg-[#F02028] group-hover:text-white">
                  <Icon className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 font-mono-num text-3xl font-bold tracking-tight text-white tabular-nums">
                {card.value}
              </div>
              <div className="mt-1.5 text-xs text-zinc-400">{card.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Charts Grid: 12-col Corporate Infographic Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Archive Composition Column Chart (Interactive SVG) */}
        <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#242428] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">Cơ cấu hạng mục tư liệu</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Phân bổ số lượng bản ghi theo từng nhóm dữ liệu chính
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-[#171719] px-2.5 py-1 text-xs font-medium text-zinc-300 tabular-nums">
              {activeArchiveItem
                ? `${activeArchiveItem.label}: ${activeArchiveItem.value}`
                : `Tổng: ${archiveSeries.reduce((s, x) => s + x.value, 0)} mục`}
            </div>
          </div>

          <div className="w-full overflow-x-auto pt-2">
            <svg
              viewBox="0 0 540 210"
              role="img"
              aria-label="Biểu đồ cột cơ cấu hạng mục tư liệu lưu trữ"
              className="w-full min-w-[360px] h-auto"
            >
              {/* Subtle horizontal reference gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = 170 - ratio * 136;
                const tickValue = Math.round(maxArchiveValue * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1="36"
                      y1={y}
                      x2="528"
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity="0.14"
                      strokeWidth="1"
                    />
                    <text
                      x="28"
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="currentColor"
                      className="text-zinc-400 tabular-nums"
                    >
                      {tickValue}
                    </text>
                  </g>
                );
              })}

              {/* Columns */}
              {archiveSeries.map((item, idx) => {
                const slotWidth = 480 / archiveSeries.length;
                const barWidth = 40;
                const x = 44 + idx * slotWidth + (slotWidth - barWidth) / 2;
                const barHeight = Math.max(item.value > 0 ? 8 : 2, (item.value / maxArchiveValue) * 136);
                const y = 170 - barHeight;
                const isHovered = hoveredArchiveKey === item.key;

                return (
                  <g
                    key={item.key}
                    onMouseEnter={() => setHoveredArchiveKey(item.key)}
                    onMouseLeave={() => setHoveredArchiveKey(null)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={isHovered ? '#0087FF' : item.tone}
                      fillOpacity={hoveredArchiveKey && !isHovered ? 0.55 : 1}
                      style={{ transition: 'all 200ms ease' }}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 7}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="700"
                      fill="currentColor"
                      className={`${isHovered ? 'text-[#F02028]' : 'text-white'} tabular-nums`}
                    >
                      {item.value}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y="192"
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? '600' : '500'}
                      fill="currentColor"
                      className={isHovered ? 'text-white' : 'text-zinc-400'}
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-white/10 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#0087FF]" />
              Nhóm trọng tâm (Đoàn viên & Sự kiện)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#002F69]" />
              Khách mời & Thông điệp lãnh đạo
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#4A6B93]" />
              Mốc son & Bài viết tư liệu
            </span>
          </div>
        </div>

        {/* Chart 2: Profile Digitization Completeness Progress Bars */}
        <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#242428] p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#F02028]" />
              <h3 className="text-base sm:text-lg font-semibold text-white">Mức độ hoàn thiện hồ sơ</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Tỷ lệ hồ sơ đã có đầy đủ chân dung, tiểu sử và tư liệu đính kèm trên tổng số{' '}
              <span className="font-semibold text-white tabular-nums">{data.members.length}</span> hồ sơ.
            </p>
          </div>

          <div className="space-y-4">
            {completenessMetrics.map((metric) => (
              <div key={metric.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-zinc-200">{metric.label}</span>
                  <span className="font-mono-num font-semibold text-white tabular-nums">
                    {metric.pct}%{' '}
                    <span className="font-normal text-zinc-400">
                      ({metric.count}/{metric.total})
                    </span>
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#171719] border border-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${metric.pct}%`,
                      backgroundColor: metric.pct >= 75 ? '#0087FF' : '#002F69',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-[#171719] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 text-zinc-400">
              <FileText className="w-3.5 h-3.5 text-[#F02028]" />
              <span>Hồ sơ chính thức / Mẫu</span>
            </span>
            <span className="font-mono-num font-semibold text-white tabular-nums">
              {data.members.filter((m) => m.dataOrigin === 'real').length} thực tế ·{' '}
              {data.members.filter((m) => m.dataOrigin === 'sample').length} mẫu
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Distribution + Responsive Cohort Summary Table */}
      {cohortBreakdown.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#242428] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">Phân bổ hồ sơ theo Niên khóa & Thế hệ</h3>
              <p className="text-xs text-zinc-400">
                Nhấn vào một dòng niên khóa để đánh dấu hoặc chuyển sang danh bạ thành viên.
              </p>
            </div>
            <span className="text-xs font-medium text-zinc-400 tabular-nums">
              {cohortBreakdown.length} nhóm niên khóa
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 bg-[#171719] text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="px-5 py-3">Niên khóa / Thế hệ</th>
                  <th className="px-4 py-3">Giai đoạn</th>
                  <th className="px-4 py-3 w-[30%]">Tỷ trọng hồ sơ</th>
                  <th className="px-4 py-3 text-right">Đoàn viên</th>
                  <th className="px-4 py-3 text-right">Khách mời</th>
                  <th className="px-5 py-3 text-right">Liên kết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs sm:text-sm">
                {cohortBreakdown.map((row) => {
                  const pct = Math.round((row.total / maxCohortCount) * 100);
                  const isSelected = selectedCohortKey === row.key;
                  return (
                    <tr
                      key={row.key}
                      onClick={() =>
                        setSelectedCohortKey((prev) => (prev === row.key ? null : row.key))
                      }
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#F02028]/15'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="px-5 py-3.5 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: isSelected ? '#0087FF' : '#002F69',
                            }}
                          />
                          <span>{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-400 tabular-nums">{row.period}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 rounded-full bg-[#171719] border border-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{
                                width: `${Math.max(row.total > 0 ? 8 : 0, pct)}%`,
                                backgroundColor: isSelected ? '#0087FF' : '#002F69',
                              }}
                            />
                          </div>
                          <span className="font-mono-num text-xs font-semibold text-white w-7 text-right tabular-nums">
                            {row.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num font-medium text-zinc-200 tabular-nums">
                        {row.memberCount}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono-num text-zinc-400 tabular-nums">
                        {row.guestCount}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-zinc-400 tabular-nums">
                        {row.linkedEvents} sk · {row.linkedMilestones} mốc
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
