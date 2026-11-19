# Security Specification — Hồi ký Chi đoàn Cù Chính Lan (Firestore RBAC & ABAC)

## 1. Data Invariants & Master Source of Truth

1. **Identity & Role Authority (`users`, `admins`)**:
   - The Master Source of Truth for elevated privileges is the `/admins/{uid}` collection plus the verified bootstrap administrator email (`hopnghiep2@gmail.com` with `email_verified == true`).
   - Users can never self-assign `role: "admin"` on `/users/{uid}` creation or update.
   - Only verified admins can grant or revoke `/admins/{uid}` records, and an admin cannot delete their own admin grant.
2. **PII Isolation (Split Collection Pattern)**:
   - Public yearbook profiles at `/members/{memberId}` contain strictly non-PII biography, portraits, role, occupation, achievements, activity photos, articles, and public URLs (`facebook`, `website`).
   - Personally Identifiable Information (`phone`, `email`, `zalo`, `viber`) is strictly isolated at `/members/{memberId}/private/contact`.
   - Access to `/members/{memberId}/private/contact` requires the Master Gate: parent `/members/{memberId}` must exist (or `existsAfter` during atomic batch creation) AND caller must be `isAdmin()` or the profile's `ownerUid == request.auth.uid`. Listing PII is unconditionally denied (`allow list: if false`).
3. **Immutable Audit & Temporal Integrity**:
   - All `createdAt` and `updatedAt` fields must equal `request.time` (server timestamp). Client-forged timestamps are rejected.
   - `id`, `createdBy`, `createdAt`, and `uid` fields are immortal (cannot change after creation).
4. **Volumetric & Structural Hygiene**:
   - All document IDs match `^[a-zA-Z0-9_\-]+$` with `1..128` characters.
   - Every string field has an explicit `.size()` ceiling matching `firebase-blueprint.json`.
   - Every list field has an explicit `.size() <= MAX` bound and element-type guard.
   - Shadow fields (undeclared keys) are rejected on both `create` (`hasAll` + `hasOnly`) and `update` (`affectedKeys().hasOnly(...)`).
5. **Query Security & Zero-Read List Rules**:
   - Public memoir collections (`milestones`, `leaderMessages`, `cohorts`, `members`, `events`) enforce `isSignedIn() && resource.data.visibility == 'public'` directly on `allow list` with zero `get()` or `exists()` lookups.

---

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)

### Payload 1 — Self-Assigned Admin Role Escalation (`/users/{uid}` CREATE)
```json
{
  "uid": "user_attacker",
  "displayName": "Attacker",
  "email": "attacker@example.com",
  "photoURL": "",
  "role": "admin",
  "createdAt": "SERVER_TIMESTAMP",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Violation*: Non-admin attempts to register with `role: "admin"`.

### Payload 2 — Shadow Field Injection on User Profile (`/users/{uid}` UPDATE)
```json
{
  "displayName": "Normal Name",
  "isVerified": true,
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Violation*: Injects undeclared ghost field `isVerified` during update.

### Payload 3 — Unverified Email Spoofing Bootstrap Admin (`/memoirConfig/main` UPDATE)
```json
{
  "auth": { "uid": "spoof_uid", "token": { "email": "hopnghiep2@gmail.com", "email_verified": false } },
  "data": { "schemaVersion": "1.1.0", "visibility": "public" }
}
```
*Violation*: Matches admin email string but `email_verified` is `false`.

### Payload 4 — Non-Owner Reading Private Member PII (`/members/mem_1/private/contact` GET)
```json
{
  "auth": { "uid": "other_member_uid", "token": { "email": "other@example.com", "email_verified": true } },
  "operation": "GET /members/mem_1/private/contact"
}
```
*Violation*: Authenticated non-owner, non-admin attempts to read phone/email/zalo/viber.

### Payload 5 — Unauthorized List Query Scraping Private Contact Subcollection (`/members/mem_1/private` LIST)
```json
{
  "auth": { "uid": "member_owner_uid", "token": { "email": "owner@example.com", "email_verified": true } },
  "operation": "LIST /members/mem_1/private"
}
```
*Violation*: Attempts to list PII subcollection (`allow list: if false`).

### Payload 6 — Member Owner Attempting Structural Field Escalation (`/members/mem_1` UPDATE)
```json
{
  "group": "guest_advisor",
  "orderIndex": 0,
  "ownerUid": "other_uid",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Violation*: Tier 2 member owner tries to modify Tier 1 admin-only fields (`group`, `orderIndex`, `ownerUid`).

### Payload 7 — Identity Spoofing on Member Creation (`/members/mem_spoof` CREATE)
```json
{
  "id": "mem_spoof",
  "group": "member",
  "ownerUid": "victim_uid",
  "createdBy": "victim_uid",
  "fullName": "Impersonated Member",
  "visibility": "public"
}
```
*Violation*: Non-admin attempts to set `ownerUid` / `createdBy` to another UID.

### Payload 8 — Resource Poisoning / Overlong Document ID (`/milestones/<200-char-id>` CREATE)
```json
{
  "docId": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "title": "Poisoned ID",
  "year": "2026"
}
```
*Violation*: Violates `isValidId(milestoneId)` (`size() <= 128` and regex guard).

### Payload 9 — Forged Client Timestamp (`/events/evt_1` CREATE)
```json
{
  "id": "evt_1",
  "title": "Fake Backdated Event",
  "createdAt": "2020-01-01T00:00:00Z",
  "updatedAt": "2020-01-01T00:00:00Z"
}
```
*Violation*: Violates Temporal Integrity (`createdAt == request.time && updatedAt == request.time`).

### Payload 10 — Value Poisoning on Allowed Update Field (`/members/mem_1` UPDATE)
```json
{
  "fullName": 123456,
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Violation*: Allowed key `fullName` receives wrong type (`number` instead of `string`); blocked because `isValidMember(incoming())` wraps the entire update block.

### Payload 11 — Unbounded Array Exhaustion (`/events/evt_1` UPDATE)
```json
{
  "participantMemberIds": ["m1", "m2", "... 250 items ..."],
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Violation*: Exceeds `participantMemberIds.size() <= 200` array guard.

### Payload 12 — Orphaned PII Subcollection Creation (`/members/nonexistent_member/private/contact` CREATE)
```json
{
  "memberId": "nonexistent_member",
  "ownerUid": "user_1",
  "phone": "0901234567",
  "email": "orphan@example.com",
  "zalo": "",
  "viber": "",
  "updatedAt": "SERVER_TIMESTAMP"
}
```
*Violation*: Violates Master Gate (`existsAfter(/databases/$(database)/documents/members/$(memberId))` is false).
