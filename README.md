# 🎵 RandomSong

A minimal web app that serves you a random Spotify track with one click — no login required.

![RandomSong screenshot](https://via.placeholder.com/700x400?text=RandomSong+Preview)

---

## Features

- 🎲 Random song on every click (letter, genre, or year-based search)
- 🖼 Album cover, song name, artist, release year
- ▶ 30-second audio preview (when available)
- 🔗 "Open in Spotify" deep link
- ⚡ No user login — uses Spotify Client Credentials Flow

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A free [Spotify Developer account](https://developer.spotify.com)

---

## 1 · Get your Spotify credentials

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Log in and click **Create app**
3. Fill in:
   - **App name**: RandomSong (or anything)
   - **Redirect URI**: `http://localhost:3000` (required but unused)
4. Click **Save**, then open the app and click **Settings**
5. Copy the **Client ID** and **Client Secret**

---

## 2 · Local setup

```bash
# Clone / download the project
git clone https://github.com/you/randomsong.git
cd randomsong

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Open `.env` and paste your credentials:

```
SPOTIFY_CLIENT_ID=abc123...
SPOTIFY_CLIENT_SECRET=xyz789...
PORT=3000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 3 · Deploy to Vercel (free)

### Option A — Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow the prompts, then add your env vars:

```bash
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_CLIENT_SECRET
vercel --prod
```

### Option B — Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. In **Environment Variables**, add `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
4. Click **Deploy**

---

## Project structure

```
randomsong/
├── server.js          # Express server + Spotify API logic
├── public/
│   └── index.html     # Single-page frontend (HTML + CSS + JS)
├── .env.example       # Environment variable template
├── .gitignore
├── package.json
├── vercel.json        # Vercel deployment config
└── README.md
```

---

## How the randomisation works

The Spotify Search API requires a query string (no "random" endpoint exists).  
RandomSong uses three strategies, picked at random each request:

| Strategy | Example query |
|----------|--------------|
| Random letter | `q=k` |
| Random genre | `q=jazz` |
| Random year  | `q=year:1987` |

It also picks a random `offset` (0–499) so even the same query returns different results.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Missing SPOTIFY_CLIENT_ID` | Check your `.env` file exists and has the correct keys |
| `Spotify auth failed 401` | Double-check Client ID / Secret are correct |
| No album cover | Some older tracks have no artwork — the app shows a placeholder |
| No preview available | Spotify restricts previews in some regions; "No preview" label will show |

---

## License

MIT
