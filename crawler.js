require("dotenv").config();

const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();
const he = require("he");

const db = new sqlite3.Database("./songs.db");

const API_KEY = process.env.YOUTUBE_API_KEY;

/* ───────────────────────────────
 G LO*BAL STATE (fix loop issue)
 ────────────────────────────── */
const recentKeywords = new Map();

/* ───────────────────────────────
 U TI*L
 ────────────────────────────── */
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

/* ───────────────────────────────
 C LE*AN TITLE
 ────────────────────────────── */
function cleanTitle(title) {
  title = he.decode(title);

  return title
  .replace(/\(.*?\)/g, "")
  .replace(/\[.*?\]/g, "")
  .replace(/official/gi, "")
  .replace(/lyrics?/gi, "")
  .replace(/audio/gi, "")
  .replace(/video/gi, "")
  .replace(/hd/gi, "")
  .replace(/4k/gi, "")
  .replace(/remastered/gi, "")
  .trim();
}

/* ───────────────────────────────
 B AD* VIDEO FILTER
 ────────────────────────────── */
function isBadVideo(title) {
  const t = title.toLowerCase();

  return (
    t.includes("playlist") ||
    t.includes("mix") ||
    t.includes("compilation") ||
    t.includes("top ") ||
    t.includes("best of") ||
    t.includes("non stop") ||
    t.includes("1 hour") ||
    t.includes("hours") ||
    t.includes("100 songs")
  );
}

/* must look like real song */
function isValidStructure(title) {
  return title.includes(" - ") || title.includes(":");
}

/* ───────────────────────────────
 K EY*WORD GUARD (IMPORTANT FIX)
 ────────────────────────────── */
function cleanKeyword(k) {
  return k
  .replace(/[^a-zA-Z0-9 ]/g, "")
  .replace(/\s+/g, " ")
  .trim();
}

function isBadKeyword(k) {
  const x = k.toLowerCase();

  return (
    x.includes("mix") ||
    x.includes("playlist") ||
    x.includes("top ") ||
    x.includes("best of") ||
    x.includes("compilation") ||
    x.includes("100") ||
    x.includes("songs songs") ||
    x.includes("|") ||
    k.length > 40
  );
}

/* 🚫 KEY FIX: prevents infinite loop */
function isRecentlyUsed(keyword) {
  const now = Date.now();
  const last = recentKeywords.get(keyword);

  if (last && now - last < 1000 * 60 * 60 * 6) {
    return true; // 6 hour cooldown
  }

  recentKeywords.set(keyword, now);
  return false;
}

/* ───────────────────────────────
 D UR*ATION FILTER (≤ 7 min)
 ────────────────────────────── */
function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  const h = parseInt(m?.[1] || 0);
  const min = parseInt(m?.[2] || 0);
  const s = parseInt(m?.[3] || 0);

  return h * 3600 + min * 60 + s;
}

function isValidDuration(sec) {
  return sec > 0 && sec <= 420;
}

/* ───────────────────────────────
 A RT*IST PARSER
 ────────────────────────────── */
function extractArtistAndTitle(raw) {
  const t = cleanTitle(raw);

  if (t.includes(" - ")) {
    const [artist, ...rest] = t.split(" - ");
    return { artist: artist.trim(), title: rest.join(" - ").trim() };
  }

  if (t.includes(":")) {
    const [artist, ...rest] = t.split(":");
    return { artist: artist.trim(), title: rest.join(":").trim() };
  }

  return { artist: null, title: t };
}

/* ───────────────────────────────
 S ON*G KEY
 ────────────────────────────── */
function generateSongKey(title, artist) {
  return ((artist || "") + title)
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "");
}

/* ───────────────────────────────
 K EY*WORD SYSTEM
 ────────────────────────────── */
function getNextKeyword() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT keyword, 'base' as source FROM keywords WHERE used = 0 LIMIT 1`,
      (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row);

        db.get(
          `SELECT keyword, 'candidate' as source
          FROM keyword_candidates
          WHERE used = 0
          ORDER BY score DESC
          LIMIT 1`,
          (err2, row2) => {
            if (err2) return reject(err2);
            resolve(row2);
          }
        );
      }
    );
  });
}

function markKeywordUsed(keyword, source) {
  const table = source === "base" ? "keywords" : "keyword_candidates";

  db.run(
    `UPDATE ${table}
    SET used = 1,
    last_used = CURRENT_TIMESTAMP
    WHERE keyword = ?`,
    [keyword]
  );
}

/* ───────────────────────────────
 K EY*WORD GENERATION (FIXED)
 ONLY ARTIST BASED → NO LOOPING CHAOS
 ────────────────────────────── */
function generateKeywordsFromSong(song) {
  if (!song.artist) return [];

  const artist = cleanKeyword(song.artist);

  if (!artist || isBadKeyword(artist)) return [];

  return [
    artist,
    `${artist} songs`
  ];
}

/* ───────────────────────────────
 S AV*E KEYWORDS
 ────────────────────────────── */
function saveKeywords(list) {
  for (const k of list) {
    const clean = cleanKeyword(k);

    if (!clean || isBadKeyword(clean)) continue;

    db.run(
      `INSERT OR IGNORE INTO keyword_candidates (keyword, source, score)
      VALUES (?, 'auto', 1)`,
           [clean]
    );
  }
}

/* ───────────────────────────────
 F ET*CH LOGIC
 ────────────────────────────── */
async function fetchKeyword(kw) {
  console.log(`\n🔍 Searching: ${kw.keyword} [${kw.source}]`);

  try {
    const searchRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          q: kw.keyword,
          type: "video",
          videoCategoryId: "10",
          maxResults: 50,
          key: API_KEY
        }
      }
    );

    const items = searchRes.data.items;

    const ids = items.map(i => i.id.videoId).join(",");

    const videoRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/videos",
      {
        params: {
          part: "contentDetails",
          id: ids,
          key: API_KEY
        }
      }
    );

    const durationMap = new Map();
    for (const v of videoRes.data.items) {
      durationMap.set(v.id, parseDuration(v.contentDetails.duration));
    }

    let added = 0;

    for (const item of items) {
      const id = item.id.videoId;
      const raw = item.snippet.title;
      const uploader = item.snippet.channelTitle;

      const cleaned = cleanTitle(raw);

      if (isBadVideo(cleaned)) continue;
      if (!isValidStructure(cleaned)) continue;

      const dur = durationMap.get(id);
      if (!isValidDuration(dur)) continue;

      const parsed = extractArtistAndTitle(raw);
      const songKey = generateSongKey(parsed.title, parsed.artist);

      db.run(
        `INSERT OR IGNORE INTO songs
        (video_id, title, artist, uploader, song_key, thumbnail)
        VALUES (?, ?, ?, ?, ?, ?)`,
             [
               id,
             parsed.title,
             parsed.artist,
             uploader,
             songKey,
             `https://img.youtube.com/vi/${id}/hqdefault.jpg`
             ]
      );

      const newKw = generateKeywordsFromSong(parsed);
      saveKeywords(newKw);

      added++;
    }

    console.log(`📦 Added from "${kw.keyword}": ${added}`);

    markKeywordUsed(kw.keyword, kw.source);

  } catch (err) {
    if (err.response?.status === 429) {
      console.log("⏳ Rate limit hit → sleeping 60s...");
      await delay(60000);
      return;
    }

    console.error("❌ Error:", err.response?.data || err.message);
  }

  await delay(3000);
}

/* ───────────────────────────────
 M AI*N LOOP
 ────────────────────────────── */
async function run() {
  while (true) {
    const kw = await getNextKeyword();

    if (!kw) {
      console.log("\n✅ No more keywords.");
      break;
    }

    const clean = cleanKeyword(kw.keyword);

    if (
      !clean ||
      isBadKeyword(clean) ||
      isRecentlyUsed(clean)
    ) {
      markKeywordUsed(kw.keyword, kw.source);
      continue;
    }

    await fetchKeyword({ ...kw, keyword: clean });
  }

  console.log("\n🎧 DONE");
  db.close();
}

run();
