# WebiFlip

WebiFlip is a browser-based GIF sketchpad and public board. It lets people draw frame-by-frame animations, preview playback in the editor, export a GIF locally, and post finished work to a shared board backed by Supabase.

The project is built as a Vite + React single-page app and is deployed on Vercel. The editor and board live in the same app, with hash-based navigation between `#editor` and `#board`.

## What The Site Does

- Draw simple frame-by-frame animations on a square canvas
- Switch between brush and eraser tools
- Adjust brush size and color
- Use onion skin and loop playback controls
- Scrub through frames and preview animation timing
- Export finished work as a GIF
- Post exported GIFs to a public board
- Browse previously posted GIFs from Supabase storage and database records

## Tech Stack

- `React`
- `Vite`
- `Supabase`
- `gifenc`
- `Vercel`

## Project Structure

- [src/App.jsx](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/src/App.jsx) app shell and view switching
- [src/Components/Pages/Home.jsx](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/src/Components/Pages/Home.jsx) editor experience
- [src/Components/Pages/BoardPage.jsx](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/src/Components/Pages/BoardPage.jsx) public GIF board
- [src/utils/gifExport.js](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/src/utils/gifExport.js) GIF generation and download helpers
- [src/utils/gifBoard.js](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/src/utils/gifBoard.js) Supabase board reads and writes
- [supabase/setup-gif-board.sql](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/supabase/setup-gif-board.sql) database, bucket, and policy setup

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the project root with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_BOARD_TABLE=gif_board_posts
VITE_SUPABASE_BOARD_BUCKET=gif-board
```

Only the `VITE_` variables are exposed to the frontend. Do not place a Supabase `service_role` key in this app.

## Supabase Setup

This app expects:

- A table for board posts
- A public storage bucket for GIF uploads
- RLS and storage policies that allow the app to read and post

Run the SQL in [supabase/setup-gif-board.sql](/c:/Users/jonat/OneDrive/Desktop/workspace/WebiFlip/supabase/setup-gif-board.sql) inside the Supabase SQL editor before using the board in a fresh project.

## Deployment

WebiFlip is set up well for Vercel deployment.

Basic deployment flow:

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Use the repo root as the project root.
4. Add the `VITE_SUPABASE_*` environment variables in Vercel.
5. Make sure the Supabase SQL setup has already been applied.
6. Deploy and test both the editor and board flows.

Because the app uses hash routing, navigation between the editor and board works without additional SPA rewrite rules.

## Notes

- The live posting flow depends on Supabase being configured correctly.
- GIF posting is intentionally simple and public-facing, so if this grows beyond MVP stage, rate limiting and tighter backend controls are worth adding.
- The `uidesign` folder contains separate UI exploration work and is not the deployed Vite app at the repo root.
