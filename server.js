import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("."));

// Fuentes de noticias
const SOURCES = [
  "https://www.sport.es/es/noticias/barca/baloncesto/",
  "https://www.mundodeportivo.com/baloncesto/fc-barcelona",
  "https://www.marca.com/baloncesto/barca.html",
  "https://as.com/baloncesto/barca/"
];

// Periodistas y cuentas de X vía Nitter
const JOURNALISTS = [
  "https://nitter.net/chemadelucas",
  "https://nitter.net/sergisoleMD",
  "https://nitter.net/martinezferran",
  "https://nitter.net/javigomezMD",
  "https://nitter.net/guille_gimenez",
  "https://nitter.net/MarcMundet",
  "https://nitter.net/JotaCuspinera",
  "https://nitter.net/OwenMurphyNBA",
  "https://nitter.net/palauresist"
];

const KEYWORDS = [
  "barça",
  "barca",
  "barsa",
  "palau",
  "resistencia",
  "euroliga",
  "barcelona",
  "fcbarcelona",
  "fcb"
];

function matchesKeywords(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some(k => lower.includes(k));
}

async function scrapeWebsites() {
  let results = [];

  for (const url of SOURCES) {
    try {
      const html = await (await fetch(url)).text();

      const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const link = match[1];
        const text = match[2].replace(/<[^>]+>/g, "");

        if (matchesKeywords(text)) {
          const around = html.substring(match.index - 500, match.index + 500);
          const imgMatch = around.match(/<img[^>]+src="([^"]+)"/);
          const image = imgMatch ? imgMatch[1] : "";

          results.push({
            title: text,
            summary: text,
            url: link.startsWith("http") ? link : url + link,
            image: image,
            source: "web"
          });
        }
      }
    } catch (e) {
      console.log("Error en:", url);
    }
  }

  return results;
}

async function scrapeTwitter() {
  let results = [];

  for (const url of JOURNALISTS) {
    try {
      const html = await (await fetch(url)).text();

      const tweetRegex = /<div class="tweet-content media-body">(.*?)<\/div>/gis;
      let match;

      while ((match = tweetRegex.exec(html)) !== null) {
        const text = match[1].replace(/<[^>]+>/g, "");

        if (matchesKeywords(text)) {
          const around = html.substring(match.index - 500, match.index + 500);
          const imgMatch = around.match(/<img[^>]+src="([^"]+)"/);
          const image = imgMatch ? imgMatch[1] : "";

          results.push({
            title: "Tweet",
            summary: text,
            url: url,
            image: image,
            source: "twitter"
          });
        }
      }
    } catch (e) {
      console.log("Error en:", url);
    }
  }

  return results;
}

async function scrapeAll() {
  const webNews = await scrapeWebsites();
  const twitterNews = await scrapeTwitter();

  const all = [...webNews, ...twitterNews];

  fs.writeFileSync("noticias.json", JSON.stringify(all, null, 2));
  console.log("Actualizado:", new Date(), "Noticias:", all.length);
}

scrapeAll();
setInterval(scrapeAll, 60 * 1000);

app.listen(PORT, () => {
  console.log("Servidor activo en Railway, puerto:", PORT);
});
