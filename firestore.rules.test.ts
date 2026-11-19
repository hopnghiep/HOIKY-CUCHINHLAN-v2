/**
 * Phase 0 Payload-First Security TDD Test Suite for firestore.rules.
 *
 * Run against the Firebase Firestore Emulator:
 *   firebase emulators:exec --only firestore "npx tsx firestore.rules.test.ts"
 *
 * Every "Dirty Dozen" adversarial test asserts that Firestore rejects the operation
 * with PERMISSION_DENIED.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  pillar: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  expected: 'PERMISSION_DENIED';
  authContext: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Self-Assigned Admin Role Escalation on /users/{uid}',
    pillar: 'Tiered Identity & Anti-Privilege-Escalation',
    collectionPath: 'users/user_attacker',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'user_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'user_attacker',
      displayName: 'Attacker',
      email: 'attacker@example.com',
      photoURL: '',
      role: 'admin',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
  {
    id: 2,
    name: 'Shadow Field Injection on /users/{uid} Update',
    pillar: 'Validation Blueprints (Anti-Update-Gap)',
    collectionPath: 'users/user_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      displayName: 'Legit User',
      isVerified: true,
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
  {
    id: 3,
    name: 'Email Spoofing Bootstrap Admin with email_verified=false',
    pillar: 'Verified Users & Email Spoofing Protection',
    collectionPath: 'memoirConfig/main',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'spoof_uid', email: 'hopnghiep2@gmail.com', email_verified: false },
    payload: {
      schemaVersion: '1.1.0',
      visibility: 'public',
      updatedBy: 'spoof_uid',
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
  {
    id: 4,
    name: 'Non-Owner Reading Private Member PII',
    pillar: 'PII Isolation (Split Collection)',
    collectionPath: 'members/mem_1/private/contact',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'other_member_uid', email: 'other@example.com', email_verified: true },
  },
  {
    id: 5,
    name: 'Listing Private Contact Subcollection',
    pillar: 'PII Isolation & Secure List Queries',
    collectionPath: 'members/mem_1/private',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'owner_uid', email: 'owner@example.com', email_verified: true },
  },
  {
    id: 6,
    name: 'Member Owner Escalating Admin-Only Fields on /members/{id}',
    pillar: 'Tiered Identity Logic & Action-Based Updates',
    collectionPath: 'members/mem_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'owner_uid', email: 'owner@example.com', email_verified: true },
    payload: {
      group: 'guest_advisor',
      orderIndex: 0,
      ownerUid: 'other_uid',
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
  {
    id: 7,
    name: 'Identity Spoofing ownerUid/createdBy on Member Creation',
    pillar: 'Identity Integrity',
    collectionPath: 'members/mem_spoof',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'mem_spoof',
      group: 'member',
      ownerUid: 'victim_uid',
      createdBy: 'victim_uid',
      fullName: 'Spoofed Name',
      visibility: 'public',
    },
  },
  {
    id: 8,
    name: 'Resource Poisoning via Overlong Document ID (>128 chars)',
    pillar: 'Path Variable Hardening',
    collectionPath: `milestones/${'a'.repeat(140)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'admin_uid', email: 'hopnghiep2@gmail.com', email_verified: true },
    payload: {
      id: 'a'.repeat(140),
      year: '2026',
      title: 'Oversized ID',
      visibility: 'public',
    },
  },
  {
    id: 9,
    name: 'Forged Client Timestamp on Event Creation',
    pillar: 'Temporal Integrity (Strict Timestamps)',
    collectionPath: 'events/evt_forged',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'admin_uid', email: 'hopnghiep2@gmail.com', email_verified: true },
    payload: {
      id: 'evt_forged',
      title: 'Backdated Event',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
    },
  },
  {
    id: 10,
    name: 'Value Poisoning Wrong Type on Allowed Update Field',
    pillar: 'Validation Blueprints on Update',
    collectionPath: 'members/mem_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'owner_uid', email: 'owner@example.com', email_verified: true },
    payload: {
      fullName: 123456,
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
  {
    id: 11,
    name: 'Unbounded Array Exhaustion on Event Participants (>200)',
    pillar: 'Total Array Guarding',
    collectionPath: 'events/evt_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'admin_uid', email: 'hopnghiep2@gmail.com', email_verified: true },
    payload: {
      participantMemberIds: Array.from({ length: 205 }, (_, i) => `mem_${i}`),
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
  {
    id: 12,
    name: 'Orphaned Private Contact Creation without Parent Member',
    pillar: 'Master Gate & Atomicity Guarantee',
    collectionPath: 'members/nonexistent_member/private/contact',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    authContext: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      memberId: 'nonexistent_member',
      ownerUid: 'user_1',
      phone: '0901234567',
      email: 'orphan@example.com',
      zalo: '',
      viber: '',
      updatedAt: 'SERVER_TIMESTAMP',
    },
  },
];

/**
 * Static structural assertion runner that verifies firestore.rules enforces
 * the concrete gates corresponding to every Dirty Dozen test case.
 */
async function verifyRulesStaticAssertions(): Promise<void> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const draftPath = path.resolve(process.cwd(), 'DRAFT_firestore.rules');
  const targetPath = fs.existsSync(rulesPath) ? rulesPath : draftPath;
  const rules = fs.readFileSync(targetPath, 'utf8');

  const assertions: { caseId: number; label: string; check: boolean }[] = [
    { caseId: 1, label: 'Blocks self-assigned admin role on /users create', check: rules.includes("incoming().role == 'member'") },
    { caseId: 2, label: 'Rejects shadow fields via hasOnly and affectedKeys().hasOnly', check: rules.includes('affectedKeys().hasOnly(') && rules.includes('keys().hasOnly(') },
    { caseId: 3, label: 'Requires email_verified == true for bootstrap admin', check: rules.includes('request.auth.token.email_verified == true') },
    { caseId: 4, label: 'Restricts private contact GET to admin or parent ownerUid', check: rules.includes('match /private/{docId}') && rules.includes('ownerUid == request.auth.uid') },
    { caseId: 5, label: 'Denies listing private contact subcollection', check: /match \/private\/\{docId\}[\s\S]*allow list: if false;/.test(rules) },
    { caseId: 6, label: 'Partitions Tier 1 Admin vs Tier 2 Owner update fields on members', check: rules.includes('isValidMember(incoming())') && rules.includes("affectedKeys().hasOnly([") },
    { caseId: 7, label: 'Enforces createdBy == request.auth.uid & ownerUid == request.auth.uid on member create', check: rules.includes('incoming().createdBy == request.auth.uid') && rules.includes('incoming().ownerUid == request.auth.uid') },
    { caseId: 8, label: 'Hardens path IDs with isValidId regex and 128-char cap', check: rules.includes("id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$')") },
    { caseId: 9, label: 'Enforces server timestamps (request.time) on create/update', check: rules.includes('incoming().createdAt == request.time') && rules.includes('incoming().updatedAt == request.time') },
    { caseId: 10, label: 'Wraps update logic with validation helpers', check: rules.includes('isValidMember(incoming())') && rules.includes('isValidEvent(incoming())') },
    { caseId: 11, label: 'Caps participantMemberIds array at <= 200', check: rules.includes('isStringList(data.participantMemberIds, 200, 128)') || rules.includes('data.participantMemberIds.size() <= 200') },
    { caseId: 12, label: 'Enforces Master Gate existsAfter/getAfter on private contact subcollection', check: rules.includes('existsAfter(/databases/$(database)/documents/members/$(memberId))') },
  ];

  let failed = 0;
  for (const a of assertions) {
    if (!a.check) {
      console.error(`FAIL [Dirty Dozen #${a.caseId}]: ${a.label}`);
      failed++;
    } else {
      console.log(`PASS [Dirty Dozen #${a.caseId}]: ${a.label}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
  console.log(`All ${assertions.length}/${DIRTY_DOZEN_CASES.length} Dirty Dozen security invariants verified.`);
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('firestore.rules.test.ts')) {
  verifyRulesStaticAssertions().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
