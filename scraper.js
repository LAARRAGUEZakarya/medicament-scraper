const axios = require('axios');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');

const BASE_URL = "https://medicament.ma/listing-des-medicaments/page/";
const MAX_PAGES = 100;

// -------------------------------
// FILTER: keep only real meds
// -------------------------------
function isValidMed(text) {
  if (!text) return false;

  const blacklist = [
    "Nouvelle recherche",
    "Listing des médicaments",
    "Information importante",
    "Pharmacie.ma",
    "Ministère",
    "Conditions",
    "Page",
    "..."
  ];

  for (const b of blacklist) {
    if (text.includes(b)) return false;
  }

  // must contain price indicator
  return text.includes("PPV") || text.includes("dhs");
}

// -------------------------------
// PARSE MEDICATION LINE
// -------------------------------
function parseMed(text) {
  text = text.replace(/"/g, '').replace(/\n/g, ' ').trim();

  const parts = text.split(' - ').filter(Boolean);

  const main = parts[0] || '';
  const lab = parts[parts.length - 1] || null;

  // PPV extraction
  const ppvMatch = text.match(/PPV:\s*([0-9]+[\.,]?[0-9]*)/i);
  const ppv = ppvMatch ? ppvMatch[1] : null;

  // main split
  const mainParts = main.split(',');

  const name = mainParts[0]?.trim() || null;

  const form_pack = mainParts.slice(1).join(',').trim() || null;

  return {
    name,
    form_pack,
    ppv,
    lab: lab?.replace(/"/g, '').trim() || null
  };
}

// -------------------------------
// SCRAPE ONE PAGE
// -------------------------------
async function scrapePage(page) {
  const url = `${BASE_URL}${page}/`;
  console.log(`Scraping page ${page}...`);

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const meds = [];

    $('li, div, p').each((i, el) => {
      let text = $(el).text();

      // normalize
      text = text.replace(/\s+/g, ' ').trim();

      if (!isValidMed(text)) return;

      // skip huge blocks (footer, info sections)
      if (text.length > 300) return;

      if (text.includes("PPV") || /\d+\.\d{2}/.test(text)) {
        const parsed = parseMed(text);

        if (parsed.name && parsed.ppv) {
          meds.push(parsed);
        }
      }
    });

    return meds;

  } catch (err) {
    console.log(`Error page ${page}:`, err.message);
    return [];
  }
}

// -------------------------------
// MAIN SCRAPER
// -------------------------------
async function main() {
  let allMeds = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const meds = await scrapePage(page);

    // STOP condition (no real data)
    if (!meds.length) {
      console.log("No more valid data → stopping.");
      break;
    }

    allMeds = allMeds.concat(meds);

    // small delay (avoid blocking)
    await new Promise(r => setTimeout(r, 300));
  }

  // -------------------------------
  // REMOVE DUPLICATES
  // -------------------------------
  const unique = [...new Map(allMeds.map(m => [
    `${m.name}-${m.ppv}`,
    m
  ])).values()];

  console.log(`Total medications: ${unique.length}`);

  // -------------------------------
  // CSV EXPORT
  // -------------------------------
  const csvWriter = createObjectCsvWriter({
    path: 'medicaments.csv',
    header: [
      { id: 'name', title: 'NAME' },
      { id: 'form_pack', title: 'FORM_PACK' },
      { id: 'ppv', title: 'PPV' },
      { id: 'lab', title: 'LAB' }
    ]
  });

  await csvWriter.writeRecords(unique);

  console.log("CSV generated successfully ✅");
}

main();