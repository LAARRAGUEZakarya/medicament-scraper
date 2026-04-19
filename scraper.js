const axios = require('axios');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');

const BASE_URL = "https://medicament.ma/listing-des-medicaments/";

async function scrapePage(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  const meds = [];

  // ⚠️ Selectors may change depending on site structure
  $('li').each((i, el) => {
    const text = $(el).text().trim();

    if (text.length > 10) {
      meds.push({
        name: text.replace(/\s+/g, ' ')
      });
    }
  });

  return meds;
}

async function main() {
  try {
    const meds = await scrapePage(BASE_URL);

    console.log(`Scraped ${meds.length} items`);

    const csvWriter = createObjectCsvWriter({
      path: 'medicaments.csv',
      header: [
        { id: 'name', title: 'NAME' }
      ]
    });

    await csvWriter.writeRecords(meds);

    console.log("CSV file created: medicaments.csv");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();