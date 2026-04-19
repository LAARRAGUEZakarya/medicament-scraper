const axios = require('axios');
const cheerio = require('cheerio');
const { createObjectCsvWriter } = require('csv-writer');

const BASE_URL = "https://medicament.ma/listing-des-medicaments/page/";

async function scrapePage(page) {
  const url = `${BASE_URL}${page}/`;
  console.log(`Scraping page ${page}...`);

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const meds = [];

    $('li').each((i, el) => {
      const text = $(el).text().trim();

      if (text.length > 10) {
        meds.push({
          name: text.replace(/\s+/g, ' ')
        });
      }
    });

    return meds;

  } catch (error) {
    console.log(`Error on page ${page}`);
    return [];
  }
}

async function main() {
  let allMeds = [];
  let page = 1;

  while (true) {
    const meds = await scrapePage(page);

    if (meds.length === 0) {
      console.log("No more data, stopping...");
      break;
    }

    allMeds = allMeds.concat(meds);
    page++;

    // small delay (important to avoid blocking)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Total medications scraped: ${allMeds.length}`);

  const csvWriter = createObjectCsvWriter({
    path: 'medicaments.csv',
    header: [
      { id: 'name', title: 'NAME' }
    ]
  });

  await csvWriter.writeRecords(allMeds);

  console.log("CSV file created: medicaments.csv");
}

main();