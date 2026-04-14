# GIF Board Technical Design

## Goal

Add a second export/publish path to WebiFlip so a user can:

1. Create an animation in the editor.
2. Export it as a GIF.
3. Post it to an on-site GIF board/gallery.

The board should feel intentionally compact and dense, inspired by Japanese web layouts:

- tight packing
- minimal spacing between cards
- many GIFs visible at once
- information-forward rather than airy/minimal

This document focuses on the first shippable version and only recommends refactors that appear necessary from the current code.

## Product Scope

### MVP

- Add a new export option: `Post to Board`
- Generate a GIF from frame 1 through the last user-drawn frame
- Upload the GIF plus lightweight metadata
- Keep posting anonymous
- Display posted GIFs in a compact board view
- Allow viewing GIF detail in place or in a lightweight modal/page

### Non-Goals for MVP

- comments
- likes
- account system
- advanced moderation tooling
- tags/search ranking
- infinite scalability work

## User Flow

### Creation Flow

1. User draws animation in editor.
2. User opens `Export`.
3. User chooses:
   - `GIF Export`
   - `Post to Board`
4. App saves current frame state before export.
5. App generates GIF using the same validated export path already in place.
6. App uploads GIF and metadata to backend.
7. App receives a board item record and updates UI.

### Board Browsing Flow

1. User opens board page.
2. App fetches latest posted GIF items.
3. Items render in a dense tile layout with no visible gaps.
4. Hover/tap can reveal metadata or controls.
5. Clicking opens a larger viewer or detail route.

## UI Direction

### Board Style

The board should look packed, busy, and playful rather than minimalist.

Key visual rules:

- tiles touch or nearly touch
- uneven tile heights are acceptable
- metadata is small and compact
- the screen should feel full
- borders, badges, tiny labels, counters, and stamps fit the style well
- avoid large empty gutters

### Layout Recommendation

Use a dense CSS grid or masonry-like layout:

- desktop: 5-8 columns depending on viewport
- tablet: 3-4 columns
- mobile: 2 columns
- gap: `0` to `4px`

Recommended tile content:

- GIF preview
- title
- author if provided
- created date
- frame count or FPS if useful

### Posting UX

When `Post to Board` is selected:

- open a compact modal or panel
- prefill title from current editor title
- optional fields:
  - author
  - caption
- show thumbnail preview
- submit button posts to board

## Technical Architecture

## Frontend

### New Routes / Screens

- `BoardPage`
  - dense GIF list/grid
- `BoardDetailPage` or modal viewer
  - larger playback
  - metadata

### New Components

- `ExportMenu`
  - current export dropdown should become reusable
- `PostToBoardDialog`
  - collects metadata and triggers upload
- `GifBoardGrid`
  - renders dense board layout
- `GifBoardTile`
  - single board item

### Data Shape

Suggested board item record:

```ts
type GifBoardItem = {
  id: string;
  title: string;
  caption?: string;
  author?: string;
  gifUrl: string;
  posterFrameUrl?: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  createdAt: string;
};
```

### State Flow

Current editor state is held locally in `Home.jsx` refs/state. For posting:

1. Save current frame state.
2. Reuse current GIF generation path.
3. Convert GIF bytes to `Blob`.
4. Upload `Blob`.
5. Persist metadata record.

The GIF generation code should remain shared between:

- local download export
- board posting export

## Backend

### Minimum Backend Responsibilities

- accept GIF uploads
- store asset
- persist metadata
- return list of board items
- return single board item detail

### Suggested API

#### `POST /api/board/posts`

Multipart upload containing:

- `gif`
- `title`
- `caption`
- `author`
- `fps`
- `frameCount`
- `width`
- `height`

Response:

```json
{
  "id": "post_123",
  "gifUrl": "/uploads/post_123.gif",
  "title": "my flip",
  "caption": "",
  "author": "jonat",
  "fps": 6,
  "frameCount": 9,
  "width": 550,
  "height": 550,
  "createdAt": "2026-04-13T18:00:00.000Z"
}
```

#### `GET /api/board/posts`

Returns latest posts for board page.

#### `GET /api/board/posts/:id`

Returns single post detail.

### Storage

Recommended options:

- simple MVP: server disk storage plus database row
- better production path: object storage such as S3-compatible bucket plus database row

Store:

- original GIF
- optional poster thumbnail

### Database Table

Suggested fields:

- `id`
- `title`
- `caption`
- `author`
- `gif_url`
- `poster_frame_url`
- `width`
- `height`
- `fps`
- `frame_count`
- `created_at`
- `status`

`status` allows future moderation without redesigning schema.

## Hobby-Scale Constraints

Current assumptions:

- this is a small hobby project
- anyone can post anonymously
- no account system for now
- add an optional `author` field beside `title`
- maximum GIF size is about `33.4 KB` if all 30 frames are used
- any GIF with fewer frames will be smaller

At that size, storage needs are very manageable:

- `1 GB` stores roughly `30,000` max-size GIFs
- `10 GB` stores roughly `300,000` max-size GIFs

That means the first version should optimize for simplicity, not scale.

## Storage And Caching Recommendation

### Simplest MVP Option

Use `Supabase` if the goal is the fastest and least-fragmented setup.

Why:

- database and file storage in one service
- built-in CDN delivery for stored files
- official docs describe a global CDN-backed storage layer
- the free plan includes `1 GB` of storage according to Supabase pricing docs

Tradeoff:

- less free storage headroom than Cloudflare R2
- free projects can pause on the free plan according to Supabase billing docs

### Strongest Free Hobby Option

Use `Cloudflare Pages + D1 + R2` if the goal is to stay free longer.

Why:

- Cloudflare pricing docs list `10 GB-month` free on R2 standard storage
- Cloudflare pricing docs list `5 GB` free database storage on D1
- Pages static hosting is free, and Workers free usage is enough for hobby traffic in many cases

Tradeoff:

- more setup overhead
- more services to wire together

### Recommendation

For this phase:

1. Pick `Supabase` if you want the easiest MVP.
2. Pick `Cloudflare Pages + D1 + R2` if you want the best free headroom.

Because GIFs are so small here, both are feasible. My practical recommendation:

- fastest path: `Supabase`
- best long-lived free hobby stack: `Cloudflare`

## Caching Strategy

For MVP, keep caching simple.

Recommended approach:

- rely on the platform CDN for GIF asset delivery
- set long cache headers on uploaded GIF files
- cache the board list response briefly, around `30` to `60` seconds, if backend tooling makes that easy
- do not introduce Redis or a separate cache layer yet

Why this is enough:

- assets are small
- the project is hobby scale
- the board can tolerate slight feed staleness
- extra cache infrastructure would add more complexity than value

Optional later optimization:

- generate a static poster image on upload
- use posters in the dense board grid
- autoplay GIFs only on hover, tap, or in-viewport

## Export / Posting Integration

### Recommended Flow

Create a shared export helper that returns both:

- `gifBlob`
- export metadata

Example:

```ts
type GifExportResult = {
  blob: Blob;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  lastDrawnFrame: number;
};
```

That helper can be used by:

- `handleExportGif`
- `handlePostToBoard`

This keeps download and upload behavior identical and avoids drift.

## Refactor Recommendations

Only a small amount of refactoring looks necessary right now.

### Recommended Now

1. Extract export logic out of `Home.jsx`

Why:

- `Home.jsx` already owns editor UI, playback, frame management, thumbnails, and export menu
- board posting will add more modal, upload, loading, and validation logic
- export responsibilities will grow fast

Suggested split:

- `src/utils/gifExport.js`
  - save current frame state input
  - collect exportable frames
  - build GIF blob
  - return metadata

2. Extract timeline thumbnail rendering from `Home.jsx`

Why:

- frame strip logic is now meaningful UI, not just placeholder buttons
- easier to reuse if board posting wants a poster frame preview

Suggested split:

- `src/Components/FrameThumbnail.jsx`
- `src/Components/FrameTimeline.jsx`

3. Extract export menu UI

Why:

- current export dropdown is good enough for now
- `Post to Board` will likely need modal launching, disabled states, and future options

Suggested split:

- `src/Components/ExportMenu.jsx`

### Not Necessary Yet

- global state library
- full editor store rewrite
- canvas/history rewrite
- route-level architecture refactor

The current editor can support the next phase if export-related logic is separated cleanly.

## Risks

### 1. Large GIF payloads

Risk:

- long animations or high FPS can create large files

Mitigation:

- enforce max frame count for posting
- enforce max GIF byte size
- show upload progress and failure message

### 2. Board performance

Risk:

- many autoplaying GIFs can hurt page performance

Mitigation:

- lazy load tiles
- pause offscreen GIFs if needed later
- use poster images until item enters viewport

### 3. Moderation / abuse

Risk:

- public uploads can be abused

Mitigation:

- add `status` field from day one
- support hidden/blocked posts
- consider anonymous rate limiting

### 4. Visual clutter becoming unusable

Risk:

- dense layout can become hard to scan

Mitigation:

- use strong tile borders
- keep title/caption compact
- use clear hover/active states
- test mobile separately

## Suggested Build Order

1. Extract shared GIF export helper from current `Home.jsx`
2. Add `Post to Board` option to export menu
3. Add posting modal/panel with `title`, `author`, and `caption`
4. Implement backend upload + metadata storage
5. Create board page with dense grid
6. Add detail view
7. Add poster-image optimization only if autoplay becomes expensive

## Open Decisions

These need product decisions before implementation:

1. Posting mode:
   Anonymous with optional `author` text field.
2. Should board items autoplay by default?
3. Should we store only GIFs, or also source frame data later for remixing?
4. Should the board sort by newest only in MVP?
5. Do we want posters/static previews before hover/play?

## Recommendation

The next phase is a good fit for the current codebase if we do a small export-focused refactor first. The main recommendation is not a broad rewrite, but to separate:

- GIF export logic
- export menu UI
- timeline/thumbnail UI

That gives enough structure to add `Post to Board` and a dense Japanese-style GIF board without destabilizing the drawing/editor behavior that is now working.
