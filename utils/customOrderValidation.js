const validator = require('validator');

/**
 * Validate custom order required fields
 * @param {Object} orderData - Custom order data object
 * @returns {string|null} - Error message or null if valid
 */
const validateCustomOrderFields = (orderData) => {
  if (!orderData.companyInfo) {
    return 'Company information is required';
  }

  const { companyName, contactPerson, email, phone } = orderData.companyInfo;

  if (!companyName || companyName.trim().length === 0) {
    return 'Company name is required';
  }

  if (companyName.trim().length > 100) {
    return 'Company name cannot exceed 100 characters';
  }

  if (!contactPerson || contactPerson.trim().length === 0) {
    return 'Contact person name is required';
  }

  if (contactPerson.trim().length > 50) {
    return 'Contact person name cannot exceed 50 characters';
  }

  if (!email || !validator.isEmail(email)) {
    return 'Valid email address is required';
  }

  if (!phone || phone.trim().length === 0) {
    return 'Phone number is required';
  }

  if (!/^[\+]?[0-9\s\-\(\)]+$/.test(phone)) {
    return 'Please provide a valid phone number';
  }

  if (!orderData.orderDetails) {
    return 'Order details are required';
  }

  const { employeeCount } = orderData.orderDetails;

  if (!employeeCount || isNaN(employeeCount)) {
    return 'Number of employees/cards is required and must be a number';
  }

  if (parseInt(employeeCount) < 10) {
    return 'Minimum order quantity is 10 cards';
  }

  if (parseInt(employeeCount) > 10000) {
    return 'Maximum order quantity is 10,000 cards';
  }

  // Validate message length if provided
  if (
    orderData.orderDetails.message &&
    orderData.orderDetails.message.length > 1000
  ) {
    return 'Additional message cannot exceed 1000 characters';
  }

  return null;
};

/**
 * Validate custom pricing information (for admin use on 10-49 and 100+ tiers)
 * @param {Object} customPricing - Custom pricing object
 * @param {number} employeeCount - Number of cards
 * @returns {string|null} - Error message or null if valid
 */
const validateCustomPricing = (customPricing, employeeCount) => {
  if (!customPricing) {
    return 'Custom pricing information is required';
  }

  const { pricePerCard } = customPricing;

  if (!pricePerCard || isNaN(pricePerCard) || pricePerCard <= 0) {
    return 'Price per card must be a positive number';
  }

  if (pricePerCard > 1000) {
    return 'Price per card seems too high. Please verify.';
  }

  // Calculate total to ensure it's reasonable
  const totalPrice = pricePerCard * employeeCount;
  if (totalPrice > 1000000) {
    return 'Total price exceeds maximum allowed amount';
  }

  return null;
};

/**
 * Validate status transition
 * @param {string} currentStatus - Current order status
 * @param {string} newStatus - New status to transition to
 * @returns {string|null} - Error message or null if valid
 */
const validateStatusTransition = (currentStatus, newStatus) => {
  const validStatuses = [
    'pending',
    'reviewing',
    'quoted',
    'approved',
    'in_production',
    'completed',
    'cancelled',
  ];

  if (!validStatuses.includes(newStatus)) {
    return `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`;
  }

  // Define valid transitions
  const validTransitions = {
    pending: ['reviewing', 'cancelled'],
    reviewing: ['quoted', 'cancelled'],
    quoted: ['approved', 'cancelled'],
    approved: ['in_production', 'cancelled'],
    in_production: ['completed', 'cancelled'],
    completed: [], // No transitions from completed
    cancelled: [], // No transitions from cancelled
  };

  const allowedNextStatuses = validTransitions[currentStatus] || [];

  if (!allowedNextStatuses.includes(newStatus)) {
    return `Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${
      allowedNextStatuses.join(', ') || 'none'
    }`;
  }

  return null;
};

/**
 * Validate admin notes
 * @param {string} notes - Admin notes
 * @returns {string|null} - Error message or null if valid
 */
const validateAdminNotes = (notes) => {
  if (notes && notes.length > 2000) {
    return 'Admin notes cannot exceed 2000 characters';
  }
  return null;
};

/**
 * Validate customer response
 * @param {Object} response - Customer response object
 * @returns {string|null} - Error message or null if valid
 */
const validateCustomerResponse = (response) => {
  if (!response) return null;

  if (response.customerNotes && response.customerNotes.length > 1000) {
    return 'Customer notes cannot exceed 1000 characters';
  }

  return null;
};

/**
 * Determine which pricing tier applies to a quantity
 * @param {number} quantity - Number of cards
 * @returns {Object} - Pricing tier information
 */
const getPricingTierInfo = (quantity) => {
  if (quantity >= 10 && quantity <= 49) {
    return {
      tier: 'starter',
      name: '10-49 cards',
      pricingType: 'custom',
      description: 'Custom pricing - contact for quote',
      features: ['Custom branding', 'Free delivery', 'Basic support'],
    };
  } else if (quantity >= 50 && quantity <= 99) {
    return {
      tier: 'standard',
      name: '50-99 cards',
      pricingType: 'fixed',
      pricePerCard: 15,
      currency: 'JOD',
      description: 'Fixed pricing with bulk benefits',
      features: [
        'Custom branding',
        'Free delivery',
        'Priority support',
        'Design assistance',
      ],
    };
  } else if (quantity >= 100) {
    return {
      tier: 'enterprise',
      name: '100+ cards',
      pricingType: 'custom',
      description: 'Enterprise pricing with maximum savings',
      features: [
        'Custom branding',
        'Free delivery',
        'Dedicated support',
        'Design assistance',
        'Volume discounts',
      ],
    };
  }

  return null;
};

module.exports = {
  validateCustomOrderFields,
  validateCustomPricing,
  validateStatusTransition,
  validateAdminNotes,
  validateCustomerResponse,
  getPricingTierInfo,
};
