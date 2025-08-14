const AppError = require('./apiError');
const { uploadMultipleImages, getRelativeFilePath } = require('./fileUpload');
// Country-City mapping for delivery validation
const COUNTRY_CITY_MAP = {
  JO: ['Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Salt'],
  UK: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Bristol'],
};

/**
 * Validate company logo requirements
 * @param {Object} cardDesign - Card design object
 * @param {Object} files - Uploaded files object
 * @param {Object} existingOrder - Existing order (for updates)
 * @returns {string|null} - Error message or null if valid
 */
const validateCompanyLogo = (cardDesign, files = {}, existingOrder = null) => {
  if (!cardDesign || !cardDesign.includePrintedLogo) {
    return null; // No validation needed if logo is not required
  }

  // Check for uploaded logo file
  const hasUploadedLogo =
    cardDesign.companyLogo ||
    (files.companyLogo && files.companyLogo.length > 0);

  // Check for existing logo (for updates)
  const hasExistingLogo = existingOrder?.cardDesign?.companyLogo;

  if (!hasUploadedLogo && !hasExistingLogo) {
    return 'Company logo is required when printed logo is selected';
  }

  return null;
};

/**
 * Validate country and city combination
 * @param {string} country - Country code
 * @param {string} city - City name
 * @returns {string|null} - Error message or null if valid
 */
const validateCountryCity = (country, city) => {
  if (!country || !city) {
    return null; // Skip validation if either is missing
  }

  const validCities = COUNTRY_CITY_MAP[country];
  if (!validCities) {
    const availableCountries = Object.keys(COUNTRY_CITY_MAP).join(', ');
    return `Invalid country '${country}'. Available countries are: ${availableCountries}`;
  }

  if (!validCities.includes(city)) {
    return `Invalid city '${city}' for country '${country}'. Valid cities are: ${validCities.join(
      ', '
    )}`;
  }

  return null;
};

/**
 * Validate delivery information
 * @param {Object} deliveryInfo - Delivery information object
 * @param {Object} existingOrder - Existing order (for updates)
 * @returns {string|null} - Error message or null if valid
 */
const validateDeliveryInfo = (deliveryInfo, existingOrder = null) => {
  if (!deliveryInfo) return null;

  // Use new values if provided, otherwise fall back to existing values
  const country = deliveryInfo.country || existingOrder?.deliveryInfo?.country;
  const city = deliveryInfo.city || existingOrder?.deliveryInfo?.city;

  return validateCountryCity(country, city);
};

/**
 * Validate required order fields for creation
 * @param {Object} orderData - Order data object
 * @returns {string|null} - Error message or null if valid
 */
const validateRequiredFields = (orderData) => {
  if (!orderData.personalInfo) {
    return 'Personal information is required';
  }

  if (!orderData.cardDesign) {
    return 'Card design information is required';
  }

  if (!orderData.deliveryInfo) {
    return 'Delivery information is required';
  }

  if (!orderData.product) {
    return 'Product ID is required';
  }

  return null;
};

/**
 * Get available cities for a country
 * @param {string} country - Country code
 * @returns {Array} - Array of valid cities
 */
const getValidCities = (country) => {
  return COUNTRY_CITY_MAP[country] || [];
};

/**
 * Get all available countries
 * @returns {Array} - Array of country codes
 */
const getValidCountries = () => {
  return Object.keys(COUNTRY_CITY_MAP);
};

// Middleware to parse FormData into nested objects
const parseFormData = (req, res, next) => {
  // console.log('Raw req.body before parsing:', req.body);

  // Initialize the nested objects
  const parsedBody = {
    personalInfo: {},
    cardDesign: {},
    deliveryInfo: {},
  };

  // Parse all keys and organize them into nested objects
  for (const key in req.body) {
    if (key.startsWith('personalInfo[')) {
      const nestedKey = key.replace('personalInfo[', '').replace(']', '');

      if (nestedKey.includes('[') && nestedKey.includes(']')) {
        // Handle arrays like phoneNumbers[0]
        const arrayKey = nestedKey.split('[')[0];
        const arrayIndex = parseInt(nestedKey.split('[')[1].replace(']', ''));
        if (!parsedBody.personalInfo[arrayKey])
          parsedBody.personalInfo[arrayKey] = [];
        parsedBody.personalInfo[arrayKey][arrayIndex] = req.body[key];
      } else {
        parsedBody.personalInfo[nestedKey] = req.body[key];
      }
    } else if (key.startsWith('cardDesign[')) {
      const nestedKey = key.replace('cardDesign[', '').replace(']', '');
      parsedBody.cardDesign[nestedKey] = req.body[key];
    } else if (key.startsWith('deliveryInfo[')) {
      const nestedKey = key.replace('deliveryInfo[', '').replace(']', '');
      parsedBody.deliveryInfo[nestedKey] = req.body[key];
    }
  }

  // Only add nested objects if they have properties
  if (Object.keys(parsedBody.personalInfo).length > 0) {
    req.body.personalInfo = parsedBody.personalInfo;
  }

  if (Object.keys(parsedBody.cardDesign).length > 0) {
    req.body.cardDesign = parsedBody.cardDesign;

    // Convert string boolean to actual boolean
    if (req.body.cardDesign.includePrintedLogo !== undefined) {
      req.body.cardDesign.includePrintedLogo =
        req.body.cardDesign.includePrintedLogo === 'true' ||
        req.body.cardDesign.includePrintedLogo === true;
    }

    // Handle color - convert hex to name if needed
    if (req.body.cardDesign.color) {
      const color = req.body.cardDesign.color.toLowerCase();
      if (color === '#000' || color === '#000000' || color === 'black') {
        req.body.cardDesign.color = 'black';
      } else if (color === '#fff' || color === '#ffffff' || color === 'white') {
        req.body.cardDesign.color = 'white';
      }
    }
  }

  if (Object.keys(parsedBody.deliveryInfo).length > 0) {
    req.body.deliveryInfo = parsedBody.deliveryInfo;

    // Convert string boolean to actual boolean
    if (req.body.deliveryInfo.useSameContact !== undefined) {
      req.body.deliveryInfo.useSameContact =
        req.body.deliveryInfo.useSameContact === 'true' ||
        req.body.deliveryInfo.useSameContact === true;
    }
  }

  // console.log(
  //   'Parsed req.body after processing:',
  //   JSON.stringify(req.body, null, 2)
  // );
  next();
};

// Middleware to process uploaded files for orders
const processOrderFiles = (req, res, next) => {
  if (req.file && req.file.fieldname === 'companyLogo') {
    const companyLogoPath = getRelativeFilePath(req.file);
    // console.log('companyLogoPath from req.file...', companyLogoPath);

    // Ensure cardDesign exists
    if (!req.body.cardDesign) {
      req.body.cardDesign = {};
    }

    req.body.cardDesign.companyLogo = companyLogoPath;
    // console.log('req.body.cardDesign after adding logo:', req.body.cardDesign);
  }
  // Check for multiple file upload (req.files) - just in case
  else if (
    req.files &&
    req.files.companyLogo &&
    req.files.companyLogo.length > 0
  ) {
    const companyLogoPath = getRelativeFilePath(req.files.companyLogo[0]);
    // console.log('companyLogoPath from req.files...', companyLogoPath);

    // Ensure cardDesign exists
    if (!req.body.cardDesign) {
      req.body.cardDesign = {};
    }

    req.body.cardDesign.companyLogo = companyLogoPath;
    // console.log('req.body.cardDesign after adding logo:', req.body.cardDesign);
  } else {
    // console.log('No companyLogo file found in req.file or req.files');
  }

  next();
};

module.exports = {
  validateCompanyLogo,
  validateCountryCity,
  validateDeliveryInfo,
  validateRequiredFields,
  getValidCities,
  parseFormData,
  processOrderFiles,
  getValidCountries,
  COUNTRY_CITY_MAP,
};
