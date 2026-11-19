import { auth, FIREBASE_CONFIG } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getFirestoreUpgradeUrl(): string {
  return `https://console.firebase.google.com/project/${FIREBASE_CONFIG.projectId}/firestore/databases/${FIREBASE_CONFIG.firestoreDatabaseId}/data?openUpgradeDialog=true`;
}

export function formatFirestoreUserMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  let extracted = raw;
  try {
    const parsed = JSON.parse(raw) as Partial<FirestoreErrorInfo>;
    if (parsed && typeof parsed.error === 'string') {
      extracted = parsed.error;
    }
  } catch {
    // Not JSON
  }

  if (extracted.includes("Free daily read units per project (free tier database)")) {
    return `Đã vượt hạn mức đọc miễn phí hằng ngày của Firestore. Bạn có thể chờ đặt lại vào ngày mai hoặc nâng cấp tại: ${getFirestoreUpgradeUrl()}`;
  }
  if (extracted.includes('Quota exceeded')) {
    return 'Đã vượt hạn mức sử dụng miễn phí (Quota exceeded) của Cloud Firestore. Hạn mức sẽ được đặt lại vào ngày mai.';
  }
  if (extracted.toLowerCase().includes('missing or insufficient permissions') || extracted.includes('permission-denied')) {
    return 'Bạn không có quyền thực hiện thao tác này trên Cloud Firestore. Vui lòng kiểm tra tài khoản đăng nhập.';
  }
  if (extracted.toLowerCase().includes('the client is offline')) {
    return 'Không thể kết nối máy chủ Cloud Firestore. Dữ liệu vẫn được lưu an toàn cục bộ.';
  }
  return extracted || 'Đã xảy ra lỗi khi đồng bộ dữ liệu với Cloud Firestore.';
}
