require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// ── Spotify token cache ───────────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env");
  }

  const credentials = Buffer.from(
    `${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Spotify auth failed: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  console.log("TOKEN OK:", cachedToken.slice(0, 10));
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;
  return cachedToken;
}

// ── Random song helpers ───────────────────────────────────────────────────────
const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";
const SEARCH_TYPES = [
  () => RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)],
  () => {
    const genres = [
      "pop", "rock", "jazz", "hip-hop", "classical", "electronic",
      "r&b", "country", "metal", "folk", "soul", "reggae", "blues",
      "indie", "punk", "disco", "funk", "latin", "ambient",
    ];
    return genres[Math.floor(Math.random() * genres.length)];
  },
  () => {
    const year = 1960 + Math.floor(Math.random() * 64);
    return `year:${year}`;
  },
];

function buildRandomQuery() {
  const strategy = SEARCH_TYPES[Math.floor(Math.random() * SEARCH_TYPES.length)];
  return strategy();
}

// ── /api/random-song ──────────────────────────────────────────────────────────
app.get("/api/random-song", async (req, res) => {
  try {
    const token = await getSpotifyToken();

    const query = buildRandomQuery();
    const offset = Math.floor(Math.random() * 500);

    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "track");
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("offset", offset.toString());

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!searchRes.ok) {
      const err = await searchRes.text();
      throw new Error(`Spotify search failed: ${err}`);
    }

    const searchData = await searchRes.json();
    const track = searchData?.tracks?.items?.[0];

    if (!track) {
      return res.redirect("/api/random-song");
    }

    res.json({
      id:          track.id,
      name:        track.name,
      artist:      track.artists.map((a) => a.name).join(", "),
      album:       track.album.name,
      albumCover:  track.album.images?.[0]?.url || "https://via.placeholder.com/300?text=No+Cover",
      spotifyUrl:  track.external_urls.spotify,
      previewUrl:  track.preview_url,
      releaseYear: track.album.release_date?.split("-")[0] || "—",
      popularity:  track.popularity,
    });
  } catch (err) {
    console.error("[/api/random-song]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Fallback ──────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🎵 RandomSong running at http://localhost:${PORT}\n`);
});
