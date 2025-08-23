const AppError = require('./apiError');
const { uploadMultipleImages, getRelativeFilePath } = require('./fileUpload');
const Country = require('../models/countryModel');
const City = require('../models/cityModel');

/**
 * Validate company logo requirements
 * @param {Object} cardDesign - Card design object
 * @param {Object} files - Uploaded files object
 * @param {Object} existingOrder - Existing order (for updates)
 * @returns {string|null} - Error message or null if valid
 */
const validateCompanyLogo = (cardDesign, file = {}, existingOrder = null) => {
  if (!cardDesign || !cardDesign.includePrintedLogo) {
    return null; // No validation needed if logo is not required
  }

  // Check for uploaded logo file
  const hasUploadedLogo = cardDesign.companyLogo || file;

  // Check for existing logo (for updates)
  const hasExistingLogo = existingOrder?.cardDesign?.companyLogo;

  if (!hasUploadedLogo && !hasExistingLogo) {
    return 'Company logo is required when printed logo is selected';
  }

  return null;
};

/**
 * Validate country and city combination
 * @param {string} countryId - Country ID
 * @param {string} cityId - City ID
 * @returns {Promise<string|null>} - Error message or null if valid
 */
const validateCountryCity = async (countryId, cityId) => {
  if (!countryId || !cityId) {
    return null; // Skip validation if either is missing
  }

  // try {
  //   // Verify country exists
  //   const countryDoc = await Country.findById(countryId);
  //   if (!countryDoc) {
  //     return `Invalid country ID '${countryId}'. Country not found.`;
  //   }

  //   // Verify city exists and belongs to the country
  //   const cityDoc = await City.findById(cityId);
  //   if (!cityDoc) {
  //     return `Invalid city ID '${cityId}'. City not found.`;
  //   }

  //   if (cityDoc.country.toString() !== countryId) {
  //     return `City '${cityDoc.name}' does not belong to country '${countryDoc.name}'.`;
  //   }

  //   return null;
  // } catch (error) {
  //   return `Error validating country and city: ${error.message}`;
  // }
};

/**
 * Validate delivery information
 * @param {Object} deliveryInfo - Delivery information object
 * @param {Object} existingOrder - Existing order (for updates)
 * @returns {Promise<string|null>} - Error message or null if valid
 */
const validateDeliveryInfo = async (deliveryInfo, existingOrder = null) => {
  if (!deliveryInfo) return null;

  // Use new values if provided, otherwise fall back to existing values
  const country = deliveryInfo.country || existingOrder?.deliveryInfo?.country;
  const city = deliveryInfo.city || existingOrder?.deliveryInfo?.city;

  return await validateCountryCity(country, city);
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
 * @param {string} countryId - Country ID
 * @returns {Promise<Array>} - Array of valid cities
 */
const getValidCities = async (countryId) => {
  try {
    const cities = await City.find({
      country: countryId,
      isActive: true,
      isDeleted: { $ne: true },
    }).select('name _id');
    return cities;
  } catch (error) {
    console.error('Error getting valid cities:', error);
    return [];
  }
};

/**
 * Get all available countries
 * @returns {Promise<Array>} - Array of countries with ID and name
 */
const getValidCountries = async () => {
  try {
    const countries = await Country.find({
      isActive: true,
      isDeleted: { $ne: true },
    }).select('name code _id');
    return countries;
  } catch (error) {
    console.error('Error getting valid countries:', error);
    return [];
  }
};

// Middleware to parse FormData into nested objects
const parseFormData = (req, res, next) => {
  console.log('Raw request body:', req.body);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Files:', req.file || req.files);
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
  console.log('req.file ', req.file);
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
};
