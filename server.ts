import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const MEMOIR_STORE_PATH = path.join(DATA_DIR, 'memoir-store.json');
const MEMOIR_BACKUP_PATH = path.join(DATA_DIR, 'memoir-backup-prev.json');
const ADMIN_AUTH_PATH = path.join(DATA_DIR, 'admin-auth.json');
const SESSION_SECRET_PATH = path.join(DATA_DIR, 'session-secret.key');
const SESSION_COOKIE_NAME = 'ccl_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface StoredAdminAuth {
  adminName: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

function ensureDirectories(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return process.env.SESSION_SECRET;
  }
  ensureDirectories();
  if (fs.existsSync(SESSION_SECRET_PATH)) {
    return fs.readFileSync(SESSION_SECRET_PATH, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SESSION_SECRET_PATH, secret, { mode: 0o600 });
  return secret;
}

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPasswordHash(password: string, salt: string, storedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(storedHash, 'hex');
  if (derived.length !== storedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, storedBuf);
}

function readStoredAdmin(): StoredAdminAuth | null {
  if (!fs.existsSync(ADMIN_AUTH_PATH)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(ADMIN_AUTH_PATH, 'utf8');
    return JSON.parse(raw) as StoredAdminAuth;
  } catch {
    return null;
  }
}

function isAuthConfigured(): boolean {
  return Boolean(readStoredAdmin() || (process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0));
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function signSessionToken(adminName: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      sub: adminName,
      exp: Date.now() + SESSION_TTL_MS,
    }),
    'utf8'
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): { valid: boolean; adminName: string | null } {
  if (!token || !token.includes('.')) {
    return { valid: false, adminName: null };
  }
  const [payload, sig] = token.split('.');
  if (!payload || !sig) {
    return { valid: false, adminName: null };
  }
  const expectedSig = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, adminName: null };
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string;
      exp?: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) {
      return { valid: false, adminName: null };
    }
    return { valid: true, adminName: parsed.sub || 'Quản trị viên' };
  } catch {
    return { valid: false, adminName: null };
  }
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
  return req.secure || forwardedProto.includes('https');
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const secure = isSecureRequest(req);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const secure = isSecureRequest(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    path: '/',
  });
}

function extractSessionToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME];
}

function readFirebaseApiKey(): string | null {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { apiKey?: string };
    return raw.apiKey || null;
  } catch {
    return null;
  }
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ valid: boolean; email: string | null }> {
  const apiKey = readFirebaseApiKey();
  if (!apiKey || !idToken) {
    return { valid: false, email: null };
  }
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) {
      return { valid: false, email: null };
    }
    const json = (await resp.json()) as {
      users?: { email?: string; emailVerified?: boolean; localId?: string }[];
    };
    const user = json.users?.[0];
    if (!user || !user.localId || !user.emailVerified) {
      return { valid: false, email: null };
    }
    return { valid: true, email: user.email || null };
  } catch {
    return { valid: false, email: null };
  }
}

async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractSessionToken(req);
  const session = verifySessionToken(token);
  if (session.valid) {
    next();
    return;
  }
  if (token) {
    const fb = await verifyFirebaseIdToken(token);
    if (fb.valid) {
      next();
      return;
    }
  }
  res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại bằng Google.' });
}

function atomicWriteJson(targetPath: string, data: unknown): void {
  ensureDirectories();
  const tmpPath = `${targetPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, targetPath);
}

async function startServer(): Promise<void> {
  ensureDirectories();
  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    });
  });

  // Auth status
  app.get('/api/auth/status', (req: Request, res: Response) => {
    const session = verifySessionToken(extractSessionToken(req));
    const stored = readStoredAdmin();
    res.json({
      isConfigured: isAuthConfigured(),
      authenticated: session.valid,
      adminName: session.valid ? session.adminName : null,
      configuredAdminName: stored?.adminName || (process.env.ADMIN_PASSWORD ? 'Quản trị viên hệ thống' : null),
    });
  });

  // First-time Admin setup (no hardcoded password in source code)
  app.post('/api/auth/setup', (req: Request, res: Response) => {
    if (isAuthConfigured()) {
      res.status(409).json({ error: 'Tài khoản quản trị đã được thiết lập trước đó.' });
      return;
    }
    const { adminName, password } = (req.body || {}) as { adminName?: string; password?: string };
    const cleanName = (adminName || 'Ban Quản trị Chi đoàn').trim();
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Mật khẩu quản trị phải có ít nhất 6 ký tự.' });
      return;
    }
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();
    const record: StoredAdminAuth = {
      adminName: cleanName,
      salt,
      passwordHash: hash,
      createdAt: now,
      updatedAt: now,
    };
    atomicWriteJson(ADMIN_AUTH_PATH, record);
    const token = signSessionToken(cleanName);
    setSessionCookie(req, res, token);
    res.json({ ok: true, authenticated: true, adminName: cleanName, token });
  });

  // Admin login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    if (!isAuthConfigured()) {
      res.status(400).json({ error: 'Chưa thiết lập mật khẩu quản trị. Vui lòng thiết lập lần đầu.' });
      return;
    }
    const { password } = (req.body || {}) as { password?: string };
    if (!password) {
      res.status(400).json({ error: 'Vui lòng nhập mật khẩu quản trị.' });
      return;
    }
    const stored = readStoredAdmin();
    let matched = false;
    let adminName = 'Quản trị viên';

    if (stored) {
      matched = verifyPasswordHash(password, stored.salt, stored.passwordHash);
      adminName = stored.adminName;
    } else if (process.env.ADMIN_PASSWORD) {
      const a = Buffer.from(password, 'utf8');
      const b = Buffer.from(process.env.ADMIN_PASSWORD, 'utf8');
      matched = a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    if (!matched) {
      res.status(401).json({ error: 'Mật khẩu quản trị không chính xác. Vui lòng kiểm tra lại.' });
      return;
    }

    const token = signSessionToken(adminName);
    setSessionCookie(req, res, token);
    res.json({ ok: true, authenticated: true, adminName, token });
  });

  // Admin logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  // Change admin password
  app.post('/api/auth/change-password', requireAdmin, (req: Request, res: Response) => {
    const { currentPassword, newPassword, adminName } = (req.body || {}) as {
      currentPassword?: string;
      newPassword?: string;
      adminName?: string;
    };

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    const stored = readStoredAdmin();
    let currentValid = false;
    if (stored) {
      currentValid = Boolean(currentPassword && verifyPasswordHash(currentPassword, stored.salt, stored.passwordHash));
    } else if (process.env.ADMIN_PASSWORD && currentPassword) {
      const a = Buffer.from(currentPassword, 'utf8');
      const b = Buffer.from(process.env.ADMIN_PASSWORD, 'utf8');
      currentValid = a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    if (!currentValid) {
      res.status(401).json({ error: 'Mật khẩu hiện tại không chính xác.' });
      return;
    }

    const { salt, hash } = hashPassword(newPassword);
    const nextName = (adminName || stored?.adminName || 'Ban Quản trị Chi đoàn').trim();
    const record: StoredAdminAuth = {
      adminName: nextName,
      salt,
      passwordHash: hash,
      createdAt: stored?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    atomicWriteJson(ADMIN_AUTH_PATH, record);
    const token = signSessionToken(nextName);
    setSessionCookie(req, res, token);
    res.json({ ok: true, adminName: nextName, token });
  });

  // Load persisted memoir database
  app.get('/api/memoir', (_req: Request, res: Response) => {
    if (!fs.existsSync(MEMOIR_STORE_PATH)) {
      res.status(404).json({ exists: false });
      return;
    }
    try {
      const raw = fs.readFileSync(MEMOIR_STORE_PATH, 'utf8');
      res.type('application/json').send(raw);
    } catch {
      res.status(500).json({ error: 'Không thể đọc tệp dữ liệu hồi ký trên máy chủ.' });
    }
  });

  // Persist memoir database (Admin only, keeps rolling backup before overwrite)
  app.put('/api/memoir', requireAdmin, (req: Request, res: Response) => {
    const payload = req.body as Record<string, unknown> | undefined;
    if (
      !payload ||
      typeof payload.schemaVersion !== 'string' ||
      !payload.home ||
      !Array.isArray(payload.members) ||
      !Array.isArray(payload.events)
    ) {
      res.status(400).json({ error: 'Cấu trúc dữ liệu hồi ký không hợp lệ.' });
      return;
    }

    try {
      if (fs.existsSync(MEMOIR_STORE_PATH)) {
        fs.copyFileSync(MEMOIR_STORE_PATH, MEMOIR_BACKUP_PATH);
      }
      atomicWriteJson(MEMOIR_STORE_PATH, payload);
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch {
      res.status(500).json({ error: 'Không thể lưu dữ liệu hồi ký lên máy chủ.' });
    }
  });

  // Self-service Member / Guest profile update (no Admin login required, updates ONLY existing member fields)
  app.patch('/api/members/:id', (req: Request, res: Response) => {
    const memberId = String(req.params.id || '').trim();
    const { member, seedDatabase } = (req.body || {}) as {
      member?: Record<string, unknown>;
      seedDatabase?: Record<string, unknown>;
    };

    if (!memberId || !member || typeof member !== 'object' || member.id !== memberId) {
      res.status(400).json({ error: 'Dữ liệu hồ sơ thành viên không hợp lệ.' });
      return;
    }

    try {
      let currentDb: Record<string, unknown> | null = null;
      if (fs.existsSync(MEMOIR_STORE_PATH)) {
        currentDb = JSON.parse(fs.readFileSync(MEMOIR_STORE_PATH, 'utf8')) as Record<string, unknown>;
      } else if (
        seedDatabase &&
        typeof seedDatabase.schemaVersion === 'string' &&
        seedDatabase.home &&
        Array.isArray(seedDatabase.members) &&
        Array.isArray(seedDatabase.events)
      ) {
        currentDb = seedDatabase;
      }

      if (!currentDb || !Array.isArray(currentDb.members)) {
        res.status(404).json({ error: 'Không tìm thấy cơ sở dữ liệu hồi ký trên máy chủ.' });
        return;
      }

      const membersList = currentDb.members as Record<string, unknown>[];
      const existingIdx = membersList.findIndex((m) => m.id === memberId);
      if (existingIdx === -1) {
        res.status(404).json({ error: 'Không tìm thấy hồ sơ thành viên cần cập nhật.' });
        return;
      }

      const existing = membersList[existingIdx];
      // Preserve structural/admin fields (id, group, orderIndex) while updating member's own content
      const updatedMember: Record<string, unknown> = {
        ...existing,
        cohortId: typeof member.cohortId === 'string' ? member.cohortId : existing.cohortId,
        fullName: typeof member.fullName === 'string' && member.fullName.trim() ? member.fullName.trim() : existing.fullName,
        youthPhoto: typeof member.youthPhoto === 'string' ? member.youthPhoto : existing.youthPhoto,
        presentPhoto: typeof member.presentPhoto === 'string' ? member.presentPhoto : existing.presentPhoto,
        cohortLabel: typeof member.cohortLabel === 'string' ? member.cohortLabel : existing.cohortLabel,
        presentLabel: typeof member.presentLabel === 'string' ? member.presentLabel : existing.presentLabel,
        role: typeof member.role === 'string' ? member.role : existing.role,
        occupation: typeof member.occupation === 'string' ? member.occupation : existing.occupation,
        field: typeof member.field === 'string' ? member.field : existing.field,
        joinDate: typeof member.joinDate === 'string' ? member.joinDate : existing.joinDate,
        phone: typeof member.phone === 'string' ? member.phone : existing.phone,
        email: typeof member.email === 'string' ? member.email : existing.email,
        biography: typeof member.biography === 'string' ? member.biography : existing.biography,
        selfIntro: typeof member.selfIntro === 'string' ? member.selfIntro : existing.selfIntro,
        achievements: Array.isArray(member.achievements) ? member.achievements : existing.achievements,
        activityPhotos: Array.isArray(member.activityPhotos) ? member.activityPhotos : existing.activityPhotos,
        articles: Array.isArray(member.articles) ? member.articles : existing.articles,
        youtubeVideos: Array.isArray(member.youtubeVideos) ? member.youtubeVideos : existing.youtubeVideos,
        documents: Array.isArray(member.documents) ? member.documents : existing.documents,
        socials: member.socials && typeof member.socials === 'object' ? member.socials : existing.socials,
        favoriteQuote: typeof member.favoriteQuote === 'string' ? member.favoriteQuote : existing.favoriteQuote,
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
      };

      const nextMembers = [...membersList];
      nextMembers[existingIdx] = updatedMember;

      const nextDb: Record<string, unknown> = {
        ...currentDb,
        lastModified: new Date().toISOString(),
        members: nextMembers,
      };

      if (fs.existsSync(MEMOIR_STORE_PATH)) {
        fs.copyFileSync(MEMOIR_STORE_PATH, MEMOIR_BACKUP_PATH);
      }
      atomicWriteJson(MEMOIR_STORE_PATH, nextDb);
      res.json({ ok: true, member: updatedMember, savedAt: nextDb.lastModified });
    } catch {
      res.status(500).json({ error: 'Không thể cập nhật hồ sơ thành viên lên máy chủ.' });
    }
  });

  // Persist created or updated event content on the server store
  app.put('/api/events/:id', (req: Request, res: Response) => {
    const eventId = String(req.params.id || '').trim();
    const { event, seedDatabase } = (req.body || {}) as {
      event?: Record<string, unknown>;
      seedDatabase?: Record<string, unknown>;
    };

    if (!eventId || !event || typeof event !== 'object' || event.id !== eventId) {
      res.status(400).json({ error: 'Dữ liệu sự kiện không hợp lệ.' });
      return;
    }

    try {
      let currentDb: Record<string, unknown> | null = null;
      if (fs.existsSync(MEMOIR_STORE_PATH)) {
        currentDb = JSON.parse(fs.readFileSync(MEMOIR_STORE_PATH, 'utf8')) as Record<string, unknown>;
      } else if (
        seedDatabase &&
        typeof seedDatabase.schemaVersion === 'string' &&
        seedDatabase.home &&
        Array.isArray(seedDatabase.members) &&
        Array.isArray(seedDatabase.events)
      ) {
        currentDb = seedDatabase;
      }

      if (!currentDb || !Array.isArray(currentDb.events)) {
        res.status(404).json({ error: 'Không tìm thấy cơ sở dữ liệu hồi ký trên máy chủ.' });
        return;
      }

      const eventsList = currentDb.events as Record<string, unknown>[];
      const existingIdx = eventsList.findIndex((e) => e.id === eventId);
      const existing = existingIdx >= 0 ? eventsList[existingIdx] : {};

      const savedEvent: Record<string, unknown> = {
        ...existing,
        id: eventId,
        title: typeof event.title === 'string' && event.title.trim() ? event.title.trim() : existing.title || 'Sự kiện Chi đoàn',
        category: typeof event.category === 'string' ? event.category : existing.category || 'Hoạt động khác',
        date: typeof event.date === 'string' ? event.date : existing.date || '',
        startTime: typeof event.startTime === 'string' ? event.startTime : existing.startTime || '',
        endTime: typeof event.endTime === 'string' ? event.endTime : existing.endTime || '',
        location: typeof event.location === 'string' ? event.location : existing.location || '',
        intro: typeof event.intro === 'string' ? event.intro : existing.intro || '',
        proceedings: typeof event.proceedings === 'string' ? event.proceedings : existing.proceedings || '',
        results: typeof event.results === 'string' ? event.results : existing.results || '',
        summary: typeof event.summary === 'string' ? event.summary : existing.summary || '',
        coverImage: typeof event.coverImage === 'string' ? event.coverImage : existing.coverImage || '',
        photos: Array.isArray(event.photos) ? event.photos : existing.photos || [],
        videos: Array.isArray(event.videos) ? event.videos : existing.videos || [],
        participantMemberIds: Array.isArray(event.participantMemberIds)
          ? event.participantMemberIds
          : existing.participantMemberIds || [],
        dataOrigin: 'real',
        updatedAt: new Date().toISOString(),
      };

      const nextEvents =
        existingIdx >= 0
          ? eventsList.map((e, i) => (i === existingIdx ? savedEvent : e))
          : [savedEvent, ...eventsList];

      const nextDb: Record<string, unknown> = {
        ...currentDb,
        lastModified: new Date().toISOString(),
        events: nextEvents,
      };

      if (fs.existsSync(MEMOIR_STORE_PATH)) {
        fs.copyFileSync(MEMOIR_STORE_PATH, MEMOIR_BACKUP_PATH);
      }
      atomicWriteJson(MEMOIR_STORE_PATH, nextDb);
      res.json({ ok: true, event: savedEvent, savedAt: nextDb.lastModified });
    } catch {
      res.status(500).json({ error: 'Không thể lưu và cập nhật sự kiện lên máy chủ.' });
    }
  });

  // Member image upload (JPG, JPEG, PNG, WEBP only, for self-editing portraits & activity photos)
  app.post('/api/media/member-image', (req: Request, res: Response) => {
    const { dataUrl, fileName } = (req.body || {}) as { dataUrl?: string; fileName?: string };
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Dữ liệu ảnh tải lên không hợp lệ.' });
      return;
    }
    const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Định dạng base64 không hợp lệ.' });
      return;
    }
    const mimeType = match[1].toLowerCase();
    const allowedImageExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = allowedImageExt[mimeType];
    if (!ext) {
      res.status(400).json({ error: 'Chỉ hỗ trợ ảnh định dạng JPG, JPEG, PNG hoặc WEBP.' });
      return;
    }
    const safeBase = (fileName || 'member')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const outName = `${safeBase || 'member'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;
    const outPath = path.join(UPLOADS_DIR, outName);
    try {
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.byteLength > 15 * 1024 * 1024) {
        res.status(413).json({ error: 'Dung lượng ảnh vượt quá giới hạn 15MB.' });
        return;
      }
      fs.writeFileSync(outPath, buffer);
      res.json({ ok: true, url: `/uploads/${outName}`, mimeType });
    } catch {
      res.status(500).json({ error: 'Không thể lưu ảnh lên máy chủ.' });
    }
  });

  // Member personal document upload (PDF, Office, TXT, CSV, ZIP, images up to 20MB)
  app.post('/api/media/member-document', (req: Request, res: Response) => {
    const { dataUrl, fileName, mimeType: declaredMime } = (req.body || {}) as {
      dataUrl?: string;
      fileName?: string;
      mimeType?: string;
    };
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Dữ liệu tài liệu tải lên không hợp lệ.' });
      return;
    }
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1 || !dataUrl.slice(0, commaIdx).includes(';base64')) {
      res.status(400).json({ error: 'Định dạng tệp tải lên không hợp lệ.' });
      return;
    }
    const headerMime = dataUrl.slice(5, commaIdx).split(';')[0].trim().toLowerCase();
    const effectiveMime = (headerMime || declaredMime || 'application/octet-stream').toLowerCase();
    const base64Body = dataUrl.slice(commaIdx + 1);

    const extFromName = path.extname(String(fileName || '')).toLowerCase();
    const allowedExtensions = new Set([
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.txt',
      '.csv',
      '.md',
      '.rtf',
      '.odt',
      '.ods',
      '.odp',
      '.zip',
      '.rar',
      '.7z',
      '.jpg',
      '.jpeg',
      '.png',
      '.webp',
      '.mp3',
      '.wav',
      '.m4a',
    ]);
    const mimeToExt: Record<string, string> = {
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'text/markdown': '.md',
      'application/zip': '.zip',
      'application/x-zip-compressed': '.zip',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
    };

    const resolvedExt = allowedExtensions.has(extFromName)
      ? extFromName
      : mimeToExt[effectiveMime] || '';

    if (!resolvedExt) {
      res.status(400).json({
        error: 'Định dạng tài liệu chưa được hỗ trợ. Vui lòng dùng PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP hoặc ảnh.',
      });
      return;
    }

    const originalName = (fileName || `tai_lieu${resolvedExt}`).trim().slice(0, 160);
    const safeBase = originalName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const outName = `doc_${safeBase || 'file'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${resolvedExt}`;
    const outPath = path.join(UPLOADS_DIR, outName);

    try {
      const buffer = Buffer.from(base64Body, 'base64');
      if (buffer.byteLength > 20 * 1024 * 1024) {
        res.status(413).json({ error: 'Dung lượng tài liệu vượt quá giới hạn 20MB.' });
        return;
      }
      fs.writeFileSync(outPath, buffer);
      res.json({
        ok: true,
        url: `/uploads/${outName}`,
        mimeType: effectiveMime,
        fileName: originalName,
        sizeBytes: buffer.byteLength,
      });
    } catch {
      res.status(500).json({ error: 'Không thể lưu tài liệu lên máy chủ.' });
    }
  });

  // Media upload (Admin only: JPG, JPEG, PNG, WEBP, MP4, WEBM) -> stored persistently in data/uploads
  app.post('/api/media/upload', requireAdmin, (req: Request, res: Response) => {
    const { dataUrl, fileName } = (req.body || {}) as { dataUrl?: string; fileName?: string };
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      res.status(400).json({ error: 'Dữ liệu tệp tải lên không hợp lệ.' });
      return;
    }
    const match = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      res.status(400).json({ error: 'Định dạng base64 không hợp lệ.' });
      return;
    }
    const mimeType = match[1].toLowerCase();
    const allowedExtMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
    };
    const ext = allowedExtMap[mimeType];
    if (!ext) {
      res.status(400).json({ error: 'Chỉ hỗ trợ ảnh JPG, JPEG, PNG, WEBP hoặc video MP4, WEBM.' });
      return;
    }
    const safeBase = (fileName || 'media')
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 40);
    const outName = `${safeBase || 'media'}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}${ext}`;
    const outPath = path.join(UPLOADS_DIR, outName);
    try {
      const buffer = Buffer.from(match[2], 'base64');
      fs.writeFileSync(outPath, buffer);
      res.json({ ok: true, url: `/uploads/${outName}`, mimeType });
    } catch {
      res.status(500).json({ error: 'Không thể lưu tệp đa phương tiện lên máy chủ.' });
    }
  });

  // AI Event Summarizer using @google/genai on server-side
  app.post('/api/ai/summarize-event', requireAdmin, async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
      res.status(503).json({
        error: 'Chưa cấu hình khóa API Gemini trên máy chủ. Quản trị viên vẫn có thể nhập tóm tắt thủ công.',
      });
      return;
    }

    const { title, category, date, location, intro, proceedings, results } = (req.body || {}) as {
      title?: string;
      category?: string;
      date?: string;
      location?: string;
      intro?: string;
      proceedings?: string;
      results?: string;
    };

    if (!title) {
      res.status(400).json({ error: 'Cần có tên sự kiện để tạo bản tóm tắt.' });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const prompt = [
        'Hãy viết một bản tóm tắt ngắn gọn (2 đến 3 câu, tối đa 90 từ) bằng tiếng Việt trang trọng, ấm áp, phù hợp văn phong Kỷ yếu – Hồi ký điện tử của Chi đoàn Cù Chính Lan (Đoàn trường THPT Hoàng Hoa Thám – Quận Đoàn Bình Thạnh).',
        'Chỉ tổng hợp dựa trên thông tin được cung cấp, tuyệt đối không bịa thêm số liệu hay nhân vật mới.',
        `Tên sự kiện: ${title}`,
        category ? `Phân loại: ${category}` : '',
        date ? `Ngày tổ chức: ${date}` : '',
        location ? `Địa điểm: ${location}` : '',
        intro ? `Giới thiệu: ${intro}` : '',
        proceedings ? `Diễn biến: ${proceedings}` : '',
        results ? `Kết quả / Thành tích: ${results}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là biên tập viên kỷ yếu lịch sử Đoàn thanh niên. Viết súc tích, chuẩn xác, trang trọng bằng tiếng Việt.',
        },
      });

      const summary = (response.text || '').trim();
      if (!summary) {
        res.status(502).json({ error: 'Không nhận được nội dung tóm tắt từ dịch vụ AI.' });
        return;
      }
      res.json({ ok: true, summary });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối dịch vụ AI.';
      res.status(500).json({ error: `Không thể tạo tóm tắt tự động: ${msg}` });
    }
  });

  if (IS_PROD) {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hoi ky Chi doan Cu Chinh Lan server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
