# 🎵 RandomSong

A Spotify-powered music discovery engine that builds its own song database and serves fast random music recommendations.

---

## 🚀 What this actually is

RandomSong is not just a frontend player — it is a hybrid system:

- 🧠 A crawler that collects songs from YouTube via API
- 🗄 A local SQLite database (11k+ tracks and growing)
- 🎯 A keyword-driven harvesting system
- ⚡ A fast random song delivery backend
- 🔗 Spotify integration for playback links

---

## ⚙️ Features

- 🎲 Instant random song generation
- 📦 Local SQLite song database (no external dependency at runtime)
- 🔍 Smart keyword-based crawler system
- ⏱ Rate-limit aware YouTube API handling
- 🎧 Spotify deep links for playback
- 🧹 Duplicate filtering using video_id
- ⛔ Duration filtering (removes long videos > 7 min)

---

## 🧠 How it works

1. Crawler uses a fixed keyword list (music genres, artists, trends)
2. YouTube API returns videos for each keyword
3. Songs are filtered:
   - duplicates removed
   - duration checked
   - title cleaned
4. Stored in SQLite database
5. Frontend pulls random rows for instant playback

---

## 🗃 Database

SQLite schema stores:

- video_id (unique)
- title
- artist (best-effort extraction)
- uploader
- duration
- song_key
- created_at

---

## 🧰 Setup

```bash
npm install
```

Create database:

```bash
sqlite3 songs.db < schema.sql
```

Run crawler:

```bash
node crawler.js
```

Run server:

```bash
node server.js
```

---

## 📦 Tech stack

- Node.js
- SQLite
- YouTube Data API
- Spotify links (no playback API dependency)
- Vanilla frontend

---

## ⚠️ Notes

- YouTube API quota is limited (crawler runs in batches)
- Data quality improves over time as DB grows
- Some metadata (artist name) is inferred and not always accurate
- System is designed to evolve, not be perfect at start

---

## 📈 Current status

- ~11,000+ songs collected
- Keyword-driven crawler active
- Deduplication + filtering system in place
- Moving toward production deployment

---

## 📄 License

MIT
