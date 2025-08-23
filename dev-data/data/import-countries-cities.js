const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const Country = require('../../models/countryModel');
const City = require('../../models/cityModel');

const DB = process.env.DB_CONNECTION;
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));

// READ JSON FILES
const countries = JSON.parse(
  fs.readFileSync(`${__dirname}/countries.json`, 'utf-8')
);

const cities = JSON.parse(fs.readFileSync(`${__dirname}/cities.json`, 'utf-8'));

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    // First, import countries
    const createdCountries = await Country.create(countries);
    console.log('Countries successfully loaded!');

    // Create a mapping of country names to IDs
    const countryMap = {};
    createdCountries.forEach((country) => {
      countryMap[country.name] = country._id;
    });

    // Map cities to countries and add country references
    const citiesWithCountries = cities.map((city, index) => {
      let countryId;

      // Map cities to countries based on index
      if (index < 5) {
        countryId = countryMap['Jordan'];
      } else if (index < 10) {
        countryId = countryMap['United Kingdom'];
      } else if (index < 15) {
        countryId = countryMap['United States'];
      } else {
        countryId = countryMap['Canada'];
      }

      return {
        ...city,
        country: countryId,
      };
    });

    // Import cities
    await City.create(citiesWithCountries);
    console.log('Cities successfully loaded!');

    console.log('All data successfully imported!');
  } catch (err) {
    console.log('Error importing data:', err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DB
const deleteData = async () => {
  try {
    await City.deleteMany();
    console.log('Cities successfully deleted!');

    await Country.deleteMany();
    console.log('Countries successfully deleted!');
  } catch (err) {
    console.log('Error deleting data:', err);
  }
  process.exit();
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
