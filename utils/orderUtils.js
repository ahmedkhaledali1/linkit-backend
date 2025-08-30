const { getRelativeFilePath } = require('./fileUpload');

/**
 * Calculate order total based on product price and logo inclusion
 * @param {number} productPrice - Base product price
 * @param {boolean} includePrintedLogo - Whether to include printed logo
 * @param {number} logoSurcharge - Logo surcharge amount (default: 5)
 * @returns {Object} - Object containing total and logoSurcharge
 */
const calculateOrderTotal = (
  productPrice,
  includePrintedLogo = false,
  logoSurcharge = 0,
  deliveryFee,
  addons = []
) => {
  console.log('addons in calc total...', addons);
  const surcharge = includePrintedLogo ? logoSurcharge : 0;
  const delivery = deliveryFee ?? 0;
  const addonsTotal = addons.reduce(
    (sum, addon) => sum + (addon.price || 0),
    0
  );
  return {
    total: productPrice + surcharge + delivery + addonsTotal,
    logoSurcharge: surcharge,
    addonsTotal: addonsTotal,
    finalTotal: productPrice + surcharge + delivery + addonsTotal,
  };
};

/**
 * Process file uploads for order
 * @param {Object} files - Request files object
 * @param {Object} orderData - Order data object
 * @returns {Object} - Modified order data with file paths
 */
const processOrderFiles = (file, orderData, next) => {
  if (!file) return orderData;

  // Ensure cardDesign exists
  if (!orderData?.cardDesign) {
    orderData.cardDesign = {};
  }

  // console.log('file.... ', file);
  // console.log('orderData ', orderData);

  // Add company logo path if file exists
  if (file && orderData.cardDesign) {
    orderData.cardDesign.companyLogo = getRelativeFilePath(file);
  }

  return orderData;
};

/**
 * Build update object for partial order updates
 * @param {Object} requestBody - Request body containing update fields
 * @param {Array} allowedFields - Array of allowed field paths
 * @returns {Object} - Update object for MongoDB
 */
const buildOrderUpdateObject = (requestBody, allowedFields = []) => {
  const { personalInfo, cardDesign, deliveryInfo, paymentMethod, notes } =
    requestBody;
  const updateData = {};

  // Handle personalInfo fields individually
  if (personalInfo) {
    if (personalInfo.firstName)
      updateData['personalInfo.firstName'] = personalInfo.firstName;
    if (personalInfo.lastName)
      updateData['personalInfo.lastName'] = personalInfo.lastName;
    if (personalInfo.position)
      updateData['personalInfo.position'] = personalInfo.position;
    if (personalInfo.organization)
      updateData['personalInfo.organization'] = personalInfo.organization;
    if (personalInfo.phoneNumbers)
      updateData['personalInfo.phoneNumbers'] = personalInfo.phoneNumbers;
    if (personalInfo.email)
      updateData['personalInfo.email'] = personalInfo.email;
    if (personalInfo.linkedinUrl !== undefined)
      updateData['personalInfo.linkedinUrl'] = personalInfo.linkedinUrl;
  }

  // Handle cardDesign fields individually
  if (cardDesign) {
    if (cardDesign.nameOnCard)
      updateData['cardDesign.nameOnCard'] = cardDesign.nameOnCard;
    if (cardDesign.color) updateData['cardDesign.color'] = cardDesign.color;
    if (cardDesign.includePrintedLogo !== undefined)
      updateData['cardDesign.includePrintedLogo'] =
        cardDesign.includePrintedLogo;
    if (cardDesign.companyLogo)
      updateData['cardDesign.companyLogo'] = cardDesign.companyLogo;
  }

  // Handle deliveryInfo fields individually
  if (deliveryInfo) {
    if (deliveryInfo.country)
      updateData['deliveryInfo.country'] = deliveryInfo.country;
    if (deliveryInfo.city) updateData['deliveryInfo.city'] = deliveryInfo.city;
    if (deliveryInfo.addressLine1)
      updateData['deliveryInfo.addressLine1'] = deliveryInfo.addressLine1;
    if (deliveryInfo.addressLine2 !== undefined)
      updateData['deliveryInfo.addressLine2'] = deliveryInfo.addressLine2;
    if (deliveryInfo.useSameContact !== undefined)
      updateData['deliveryInfo.useSameContact'] = deliveryInfo.useSameContact;
    if (deliveryInfo.deliveryPhone)
      updateData['deliveryInfo.deliveryPhone'] = deliveryInfo.deliveryPhone;
    if (deliveryInfo.deliveryEmail)
      updateData['deliveryInfo.deliveryEmail'] = deliveryInfo.deliveryEmail;
  }

  // Handle top-level fields
  if (paymentMethod) updateData.paymentMethod = paymentMethod;
  if (notes !== undefined) updateData.notes = notes;

  return updateData;
};

/**
 * Set default order values
 * @param {Object} orderData - Order data object
 * @param {Object} user - Current user object
 * @returns {Object} - Order data with defaults set
 */
const setOrderDefaults = (orderData, user) => {
  // Set created by user
  if (!orderData.createdBy) orderData.createdBy = user._id;

  // Set customer if not provided
  if (!orderData.customer) orderData.customer = user._id;

  return orderData;
};

/**
 * Get order population options
 * @returns {Array} - Array of population options
 */
const getOrderPopulationOptions = () => {
  return [
    { path: 'product', select: 'title price images cardDesigns' },
    { path: 'deliveryInfo.country', select: 'name code' },
    { path: 'deliveryInfo.city', select: 'name deliveryFee' },
    { path: 'addons.addon' },
  ];
};

/**
 * Format order response
 * @param {Object} order - Order document
 * @param {string} message - Success message
 * @returns {Object} - Formatted response object
 */
const formatOrderResponse = (
  order,
  message = 'Order processed successfully'
) => {
  return {
    status: 'success',
    data: {
      order,
    },
    message,
  };
};

module.exports = {
  calculateOrderTotal,
  processOrderFiles,
  buildOrderUpdateObject,
  setOrderDefaults,
  getOrderPopulationOptions,
  formatOrderResponse,
};
