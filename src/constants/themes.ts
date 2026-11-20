import type { FontPreset, FrameStyle, ThemeMode } from '../types/memoir';

export interface ThemeOptionMeta {
  id: ThemeMode;
  name: string;
  tag: string;
  description: string;
  isLight: boolean;
  defaultFont: Exclude<FontPreset, 'auto'>;
  swatches: [string, string, string, string];
}

export interface FontOptionMeta {
  id: FontPreset;
  name: string;
  subtitle: string;
  previewDisplayFont: string;
  previewBodyFont: string;
  sampleHeadline: string;
}

export interface FrameOptionMeta {
  id: FrameStyle;
  name: string;
  description: string;
}

export const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    id: 'corporate_blue',
    name: 'Modern Corporate Blue',
    tag: 'Mặc định · Doanh nghiệp & Infographic',
    description: 'Navy (#002F69), Electric Blue (#0087FF), nền xám sáng (#EEEEF0) và thẻ trắng (#FFFFFF) tối giản, trực quan.',
    isLight: true,
    defaultFont: 'corporate_inter',
    swatches: ['#002F69', '#0087FF', '#EEEEF0', '#FFFFFF'],
  },
  {
    id: 'editorial_studio',
    name: 'Editorial Portfolio · Swiss Retro',
    tag: 'Ấn phẩm Nghệ thuật',
    description: 'Nền vàng đất (#CFA159), xanh lá đậm (#1D592C), kem ấm (#F5EBDD) và lưới Swiss tối giản cao cấp.',
    isLight: true,
    defaultFont: 'editorial_swiss',
    swatches: ['#CFA159', '#1D592C', '#F5EBDD', '#64733A'],
  },
  {
    id: 'hht_50_gold',
    name: 'Hào Khí 50 Năm',
    tag: 'Biểu trưng 1976–2026',
    description: 'Xanh Hoàng Gia – Vàng Mai 50 năm – Đỏ Ngọn Lửa. Trang trọng, mạnh mẽ, đậm dấu ấn Đoàn.',
    isLight: false,
    defaultFont: 'heritage_50',
    swatches: ['#0B1933', '#122447', '#F2C230', '#E11D2E'],
  },
  {
    id: 'sunlit_campus',
    name: 'Nắng Sân Trường',
    tag: 'Hành lang xanh & Áo trắng',
    description: 'Nền sáng trong trẻo, xanh cổng trường & cột hành lang, điểm đỏ mái ngói. Đọc rõ ban ngày.',
    isLight: true,
    defaultFont: 'student_fresh',
    swatches: ['#EEF4FB', '#FFFFFF', '#0D5BB5', '#D9232E'],
  },
  {
    id: 'vintage_yearbook',
    name: 'Trang Kỷ Yếu Hoài Niệm',
    tag: 'Sổ lưu bút & Mái ngói đỏ',
    description: 'Giấy kem cổ điển, mực xanh bút máy và đỏ son nghệ thuật. Ấm áp, giàu cảm xúc hồi ức.',
    isLight: true,
    defaultFont: 'yearbook_art',
    swatches: ['#F4EFE4', '#FFFDF8', '#16325C', '#C92A2A'],
  },
  {
    id: 'youth_flame',
    name: 'Ngọn Lửa Thanh Niên',
    tag: 'Xanh Đoàn – Đỏ Nhiệt Huyết',
    description: 'Nền xám xanh đêm hiện đại, đỏ nhiệt huyết phối xanh cổng trường và ánh vàng 50 năm.',
    isLight: false,
    defaultFont: 'youth_power',
    swatches: ['#0F172A', '#1B2436', '#2589F5', '#F02028'],
  },
  {
    id: 'dark',
    name: 'Đen Than Chuẩn',
    tag: 'Mặc định gốc',
    description: 'Tông đen than cổ điển (#171719) tối giản, tập trung tối đa vào ảnh và chữ.',
    isLight: false,
    defaultFont: 'default',
    swatches: ['#111113', '#171719', '#242428', '#F02028'],
  },
  {
    id: 'neutral',
    name: 'Xám Trung Tính',
    tag: 'Cổ điển sáng hơn',
    description: 'Nền xám than dịu mắt (#232328) giữ nguyên phong cách tối giản ban đầu.',
    isLight: false,
    defaultFont: 'default',
    swatches: ['#232328', '#171719', '#323238', '#F02028'],
  },
];

export const FONT_OPTIONS: FontOptionMeta[] = [
  {
    id: 'auto',
    name: 'Tự động theo chủ đề',
    subtitle: 'Tự chọn cặp phông chữ hài hòa nhất với chủ đề màu đang dùng',
    previewDisplayFont: 'var(--font-display)',
    previewBodyFont: 'var(--font-sans)',
    sampleHeadline: 'Hành trình tri thức – Vươn tới tương lai',
  },
  {
    id: 'corporate_inter',
    name: 'Corporate Inter (Inter · Montserrat · Roboto)',
    subtitle: 'Sans-serif doanh nghiệp sắc nét, phân cấp rõ ràng, tối ưu đọc số liệu & báo cáo',
    previewDisplayFont: "'Inter', 'Montserrat', system-ui, sans-serif",
    previewBodyFont: "'Inter', 'Roboto', system-ui, sans-serif",
    sampleHeadline: 'HỒI KÝ CHI ĐOÀN CÙ CHÍNH LAN · DỮ LIỆU & TƯ LIỆU',
  },
  {
    id: 'editorial_swiss',
    name: 'Editorial Swiss (Montserrat + Cormorant)',
    subtitle: 'Montserrat 400–500 uppercase thanh thoát + Cormorant Garamond italic nghệ thuật',
    previewDisplayFont: "'Montserrat', 'Helvetica Neue', sans-serif",
    previewBodyFont: "'Montserrat', 'Be Vietnam Pro', sans-serif",
    sampleHeadline: 'CHI ĐOÀN CÙ CHÍNH LAN · HỒI KÝ ĐIỆN TỬ',
  },
  {
    id: 'heritage_50',
    name: 'Kỷ niệm 50 năm (Cổ điển nghệ thuật)',
    subtitle: 'Playfair Display + Be Vietnam Pro + nét chữ viết tay Charm',
    previewDisplayFont: "'Playfair Display', Georgia, serif",
    previewBodyFont: "'Be Vietnam Pro', system-ui, sans-serif",
    sampleHeadline: 'Hào khí 50 năm THPT Hoàng Hoa Thám',
  },
  {
    id: 'student_fresh',
    name: 'Tuổi học trò (Trong trẻo, lưu bút)',
    subtitle: 'Lora + Plus Jakarta Sans + nét lưu bút Patrick Hand',
    previewDisplayFont: "'Lora', Georgia, serif",
    previewBodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    sampleHeadline: 'Sân trường rợp bóng cây xanh kỷ niệm',
  },
  {
    id: 'yearbook_art',
    name: 'Kỷ yếu nghệ thuật (Hoài niệm)',
    subtitle: 'Cormorant Garamond + Be Vietnam Pro + chữ ký Dancing Script',
    previewDisplayFont: "'Cormorant Garamond', Georgia, serif",
    previewBodyFont: "'Be Vietnam Pro', system-ui, sans-serif",
    sampleHeadline: 'Trang lưu bút Chi đoàn Cù Chính Lan',
  },
  {
    id: 'youth_power',
    name: 'Sức mạnh Đoàn viên (Hiện đại, khỏe khoắn)',
    subtitle: 'Montserrat đậm dứt khoát + Be Vietnam Pro sắc nét',
    previewDisplayFont: "'Montserrat', system-ui, sans-serif",
    previewBodyFont: "'Be Vietnam Pro', system-ui, sans-serif",
    sampleHeadline: 'Xung kích – Sáng tạo – Bản lĩnh tuổi trẻ',
  },
  {
    id: 'default',
    name: 'Phông chữ gốc ban đầu',
    subtitle: 'Playfair Display + Plus Jakarta Sans + JetBrains Mono',
    previewDisplayFont: "'Playfair Display', Georgia, serif",
    previewBodyFont: "'Plus Jakarta Sans', system-ui, sans-serif",
    sampleHeadline: 'Hồi ký Điện tử Chi đoàn Cù Chính Lan',
  },
];

export const FRAME_OPTIONS: FrameOptionMeta[] = [
  {
    id: 'modern',
    name: 'Hiện đại gọn gàng',
    description: 'Khung ảnh tràn viền tinh gọn, bo góc sắc nét theo phong cách triển lãm số.',
  },
  {
    id: 'yearbook',
    name: 'Khung ảnh Kỷ yếu nghệ thuật',
    description: 'Viền ảnh kiểu trang kỷ yếu / ảnh in lưu bút thanh lịch, nổi nhẹ khi di chuột.',
  },
];

export const VALID_THEME_MODES: readonly ThemeMode[] = THEME_OPTIONS.map((t) => t.id);
export const VALID_FONT_PRESETS: readonly FontPreset[] = FONT_OPTIONS.map((f) => f.id);
export const VALID_FRAME_STYLES: readonly FrameStyle[] = FRAME_OPTIONS.map((f) => f.id);

export function normalizeThemeMode(value: unknown): ThemeMode {
  return typeof value === 'string' && (VALID_THEME_MODES as readonly string[]).includes(value)
    ? (value as ThemeMode)
    : 'corporate_blue';
}

export function normalizeFontPreset(value: unknown): FontPreset {
  return typeof value === 'string' && (VALID_FONT_PRESETS as readonly string[]).includes(value)
    ? (value as FontPreset)
    : 'auto';
}

export function normalizeFrameStyle(value: unknown): FrameStyle {
  return typeof value === 'string' && (VALID_FRAME_STYLES as readonly string[]).includes(value)
    ? (value as FrameStyle)
    : 'modern';
}

export function getThemeMeta(themeMode: ThemeMode): ThemeOptionMeta {
  return THEME_OPTIONS.find((t) => t.id === themeMode) || THEME_OPTIONS[0];
}

export function resolveEffectiveFontPreset(
  themeMode: ThemeMode,
  fontPreset?: FontPreset
): Exclude<FontPreset, 'auto'> {
  const normalized = normalizeFontPreset(fontPreset);
  if (normalized !== 'auto') return normalized;
  return getThemeMeta(themeMode).defaultFont;
}
