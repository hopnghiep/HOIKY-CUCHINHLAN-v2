export type DataOrigin = 'sample' | 'real';

export type MemberGroup = 'member' | 'guest_advisor';

export type EventCategory =
  | 'Phong trào'
  | 'Tình nguyện'
  | 'Đại hội'
  | 'Kỷ niệm'
  | 'Văn nghệ'
  | 'Hoạt động truyền thống'
  | 'Hoạt động khác';

export type AnthemPartType = 'Intro' | 'Verse' | 'Chorus' | 'Bridge' | 'Outro';

export interface DevelopmentStage {
  id: string;
  period: string;
  title: string;
  description: string;
}

export interface TimelineMilestone {
  id: string;
  year: string;
  title: string;
  description: string;
  orderIndex: number;
  dataOrigin: DataOrigin;
}

export interface AnthemSection {
  id: string;
  partType: AnthemPartType;
  label: string;
  lyrics: string;
}

export interface AnthemYoutubeTrack {
  id: string;
  title: string;
  author: string;
  youtubeUrl: string;
  notes: string;
}

export interface LeaderMessage {
  id: string;
  title: string;
  authorName: string;
  authorRole: string;
  period: string;
  content: string;
  thumbnailImage?: string;
  createdAt: string;
  orderIndex?: number;
  dataOrigin: DataOrigin;
}

export interface SocialChannel {
  id: string;
  platform: string;
  label: string;
  url: string;
}

export interface HeroGalleryPhoto {
  id: string;
  url: string;
  caption: string;
  addedAt: string;
}

export interface HomeMemoirData {
  hero: {
    spaceLabel: string;
    title: string;
    unitIntro: string;
    subtitle: string;
    heroImage: string;
    galleryPhotos?: HeroGalleryPhoto[];
  };
  history: {
    sectionLabel?: string;
    sectionTitle?: string;
    foundingTitle: string;
    foundingContent: string;
    stages: DevelopmentStage[];
    achievementsTitle?: string;
    achievementsSummary: string;
  };
  meaning: {
    sectionLabel?: string;
    sectionTitle?: string;
    introContent: string;
    traditionalValuesTitle?: string;
    traditionalValues: string;
    memoirGoalsTitle?: string;
    memoirGoals: string;
    generationalConnectionTitle?: string;
    generationalConnection: string;
  };
  milestonesLabel?: string;
  milestonesTitle?: string;
  messagesLabel?: string;
  messagesTitle?: string;
  anthem: {
    sectionLabel?: string;
    title: string;
    authorName?: string;
    composerInfo: string;
    relatedInfo?: string;
    coverImage: string;
    lyricsLabel?: string;
    lyrics?: string;
    sections: AnthemSection[];
    youtubeSectionTitle?: string;
    youtubeSectionSubtitle?: string;
    youtubeTracks?: AnthemYoutubeTrack[];
  };
  socialChannels: SocialChannel[];
  dataOrigin: DataOrigin;
}

export interface MemberActivityPhoto {
  id: string;
  url: string;
  caption: string;
  takenAt: string;
}

export interface MemberArticle {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
}

export interface MemberYoutubeVideo {
  id: string;
  title: string;
  youtubeUrl: string;
  notes?: string;
  addedAt: string;
}

export interface MemberDocument {
  id: string;
  title: string;
  fileName: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
  notes?: string;
  uploadedAt: string;
}

export interface CohortItem {
  id: string;
  name: string;
  period: string;
  description: string;
  linkedEventIds: string[];
  linkedMilestoneIds: string[];
  linkedMessageIds: string[];
  orderIndex: number;
  dataOrigin: DataOrigin;
}

export interface MemberProfile {
  id: string;
  group: MemberGroup;
  cohortId?: string;
  fullName: string;
  youthPhoto: string;
  presentPhoto: string;
  cohortLabel: string;
  presentLabel: string;
  role: string;
  occupation: string;
  field: string;
  joinDate: string;
  phone: string;
  email: string;
  biography: string;
  selfIntro: string;
  achievements: string[];
  activityPhotos: MemberActivityPhoto[];
  articles: MemberArticle[];
  youtubeVideos?: MemberYoutubeVideo[];
  documents?: MemberDocument[];
  socials: {
    facebook?: string;
    website?: string;
    zalo?: string;
    viber?: string;
  };
  favoriteQuote: string;
  orderIndex: number;
  dataOrigin: DataOrigin;
  ownerUid?: string;
  updatedAt: string;
}

export interface EventPhoto {
  id: string;
  url: string;
  caption: string;
  albumName: string;
}

export interface EventVideo {
  id: string;
  url: string;
  title: string;
  mimeType: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  intro: string;
  proceedings: string;
  results: string;
  summary: string;
  coverImage: string;
  photos: EventPhoto[];
  videos: EventVideo[];
  participantMemberIds: string[];
  dataOrigin: DataOrigin;
  updatedAt: string;
}

export type ThemeMode =
  | 'corporate_blue'
  | 'editorial_studio'
  | 'dark'
  | 'neutral'
  | 'hht_50_gold'
  | 'sunlit_campus'
  | 'vintage_yearbook'
  | 'youth_flame';

export type FontPreset =
  | 'auto'
  | 'corporate_inter'
  | 'editorial_swiss'
  | 'default'
  | 'heritage_50'
  | 'student_fresh'
  | 'yearbook_art'
  | 'youth_power';

export type FrameStyle = 'modern' | 'yearbook';

export interface AppSettings {
  themeMode: ThemeMode;
  fontPreset?: FontPreset;
  frameStyle?: FrameStyle;
  showSampleBanner: boolean;
  autoSaveEnabled: boolean;
  compactCards: boolean;
}

export interface MemoirDatabase {
  schemaVersion: string;
  lastModified: string;
  home: HomeMemoirData;
  milestones: TimelineMilestone[];
  leaderMessages: LeaderMessage[];
  cohorts?: CohortItem[];
  members: MemberProfile[];
  events: SchoolEvent[];
  settings: AppSettings;
}

export interface BackupPackage extends MemoirDatabase {
  appName: string;
  exportedAt: string;
  stats: {
    membersCount: number;
    guestsCount: number;
    eventsCount: number;
    articlesCount: number;
    imagesCount: number;
  };
}

export type ActiveTab = 'home' | 'members' | 'guests' | 'events' | 'admin';
