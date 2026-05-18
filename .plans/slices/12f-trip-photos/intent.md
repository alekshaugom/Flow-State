---
slice: 12f-trip-photos
status: queued
value: 7
confidence: 5
effort: M
depends_on: [12-river-log-core, 12c-river-log-sharing]
unlocks: []
opened: 2026-05-18
closed: null
---

# Slice 12f — Trip photos (intent)

## What success looks like

A boater opens a log they wrote two seasons ago and sees a strip of five photos at the top of the card — the dam release at golden hour, the eddy turn at Zoom Flume, the camp at Stone Bridge, the chocolate-milk silt run, the take-out beer. Clicking any photo opens a lightbox. The card is the **artifact**, not the form. Photos earn their place: they make the journal something to come back to.

Each person who has access to a log can attach up to **5 photos of their own** to that log. For a private log, that's just the author. For a log shared via 12c (token or friendship), each granted user gets their own 5-photo budget — so a trip with three friends viewing it can grow to 20 photos total, each clearly attributed.

Photos live in Harper blob storage. Uploads are client-resized to ≤2 MB before they leave the browser. Each photo carries the uploader's userId and a created-at timestamp. Only the uploader (or the log's author) can delete.

## What's NOT it

- Not public galleries. No photo discovery, no `/photos` route, no "popular this week."
- Not a cover photo / hero photo selection — every log just shows its thumbnails in upload order (or EXIF datetime order — decide at activation).
- Not video. Photos only.
- Not in-browser editing (crop / rotate / filter). The browser handles rotation via EXIF orientation; everything else is upload-it-as-you-want-it.
- Not photo-by-flow lookup (that's the strategic-moat content surface from `product-vision.md` — a separate, editorial-curated feature in a future slice).
- Not EXIF GPS-based location stamping or auto-geofencing. Privacy: strip EXIF before storage.
- Not a per-user storage quota dashboard. Cap is per-trip-per-user (5), not per-user-total.
- Not signed URLs / CDN edge caching — defer until we measure.

## Why this is intent-only

Image storage is one of those decisions that's easy to over-engineer ahead of time and easy to migrate later if you keep the schema clean. Better to defer until:

1. **12c is shipped** so the "anyone with shared access" rule has a real privacy model to enforce.
2. We have a non-trivial number of logs and can measure typical photo count + size before sizing storage.
3. The card design from 12b has lived for a while — the gallery should fit the card, not redefine it.

## Loose sketch (do not lock in)

### Schema

- `LogPhoto` table:
  - `id` (composite: logId + uploaderId + createdAtMillis)
  - `logId` @indexed (FK to RiverLog)
  - `uploaderId` @indexed (FK to WaitlistUser)
  - `blobKey` (Harper blob storage key)
  - `mimeType`, `widthPx`, `heightPx`, `bytes`
  - `caption` (optional, short — 140 chars)
  - `exifTimestamp` (optional, parsed before strip)
  - `createdAt`, `updatedAt`

### Resources

- `resources/LogPhoto.ts` — class `LogPhotoResource`.
  - `POST /LogPhotoResource/` — multipart upload. Server checks: requester has read access to the log (own log, or accepted share, or friendship); requester has fewer than 5 existing photos on this log; bytes < hard cap (say 8 MB pre-resize as defense in depth). Strip EXIF, store blob, write row.
  - `GET /LogPhotoResource/?logId=…` — list all photos visible to requester for that log. Includes a signed-or-relative `url` per row.
  - `DELETE /LogPhotoResource/{id}` — uploader-only or log-author-only.
- Extend `resources/RiverLog.ts` to embed `photos: LogPhotoEntry[]` in the response, scoped to whoever the requester is.

### Frontend

- `app/src/components/PhotoStrip.tsx` — horizontal thumb row on `<RiverLogCard>`. Click → `<Lightbox>`.
- `app/src/components/PhotoUploader.tsx` — drag-drop + file input. Client-side resize via `<canvas>` to max edge 2048px / JPEG quality 0.85. Progress bar.
- `app/src/components/Lightbox.tsx` — full-viewport overlay, arrow-key navigation, escape to close.
- Reserved slot on `<RiverLogCard>` (already placeholder-reserved in 12b) gets the strip rendered.

## Open questions for when this becomes active

- **Storage backend.** Harper blob storage vs filesystem vs S3? Default: Harper blob — keeps the single-runtime story. Reconsider if image volume dwarfs the rest of the DB.
- **Thumbnail generation.** Pre-generate small thumbs on upload (server-side, sharp/jimp/native canvas)? Or send the full image and let the browser scale? Defer to activation.
- **Image format.** Accept JPEG / PNG / HEIC (transcode HEIC to JPEG server-side)? WEBP outbound for size?
- **Ordering.** By upload time, EXIF datetime, or user-rearrangeable? Default: EXIF datetime ascending, fallback to upload time.
- **Per-uploader 5 cap.** Reasonable for v1; might raise to 10 if users ask.
- **Caption editing.** Inline on the lightbox? Defer.
- **Performance.** A `/logs` page with 50 trips × 5 photos = 250 thumbs. Lazy-load below the fold.

## Privacy invariant (must hold)

The same boundary 12c establishes: no one can see a photo whose underlying log they don't have access to. Enforce in the resource layer, never just the URL — opaque blob keys, never directory-listable storage.

Strip EXIF GPS before storing. Some users will not want their camp coordinates attached to a photo they shared with a friend, and we should never be the surface that leaks it.

## References that will matter when active

- Slice 12 RiverLog schema + resource: [schemas/river-log.graphql](../../../schemas/river-log.graphql), [resources/RiverLog.ts](../../../resources/RiverLog.ts)
- Slice 12c sharing model: [12c-river-log-sharing/intent.md](../12c-river-log-sharing/intent.md) — the access predicate that gates uploads + reads.
- Slice 12b card design: [12b-river-log-watershed-browse/plan.md](../12b-river-log-watershed-browse/plan.md) — the reserved gallery slot on `<RiverLogCard>`.
- Vision boundary: [vision/product-vision.md](../../vision/product-vision.md) — "Bounded social" (no public photos) and the strategic-moat "photos indexed by flow" item (separate from per-user trip photos).
