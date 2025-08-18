/**
 * Set default custom order values
 * @param {Object} orderData - Custom order data object
 * @param {Object} user - Current user object
 * @returns {Object} - Order data with defaults set
 */
const setCustomOrderDefaults = (orderData, user) => {
  // Set created by user if provided
  if (user && !orderData.createdBy) {
    orderData.createdBy = user._id;
  }

  // Ensure nested objects exist
  if (!orderData.companyInfo) {
    orderData.companyInfo = {};
  }

  if (!orderData.orderDetails) {
    orderData.orderDetails = {};
  }

  // Set default status
  if (!orderData.status) {
    orderData.status = 'pending';
  }

  return orderData;
};

/**
 * Get custom order population options
 * @returns {Array} - Array of population options
 */
const getCustomOrderPopulationOptions = () => {
  return [
    { path: 'createdBy', select: 'name email' },
    { path: 'handledBy', select: 'name email' },
  ];
};

/**
 * Format custom order response
 * @param {Object} order - Custom order document
 * @param {string} message - Success message
 * @returns {Object} - Formatted response object
 */
const formatCustomOrderResponse = (
  order,
  message = 'Custom order processed successfully'
) => {
  return {
    status: 'success',
    data: {
      customOrder: order,
    },
    message,
  };
};

/**
 * Build custom order update object for partial updates
 * @param {Object} requestBody - Request body containing update fields
 * @returns {Object} - Update object for MongoDB
 */
const buildCustomOrderUpdateObject = (requestBody) => {
  const updateData = {};

  // Handle company info updates
  if (requestBody.companyInfo) {
    const { companyName, contactPerson, email, phone } =
      requestBody.companyInfo;

    if (companyName !== undefined)
      updateData['companyInfo.companyName'] = companyName;
    if (contactPerson !== undefined)
      updateData['companyInfo.contactPerson'] = contactPerson;
    if (email !== undefined) updateData['companyInfo.email'] = email;
    if (phone !== undefined) updateData['companyInfo.phone'] = phone;
  }

  // Handle order details updates
  if (requestBody.orderDetails) {
    const { employeeCount, message } = requestBody.orderDetails;

    if (employeeCount !== undefined)
      updateData['orderDetails.employeeCount'] = employeeCount;
    if (message !== undefined) updateData['orderDetails.message'] = message;
  }

  // Handle custom pricing updates (admin only)
  if (requestBody.customPricing) {
    const { pricePerCard, totalPrice, isCustom } = requestBody.customPricing;

    if (pricePerCard !== undefined)
      updateData['customPricing.pricePerCard'] = pricePerCard;
    if (totalPrice !== undefined)
      updateData['customPricing.totalPrice'] = totalPrice;
    if (isCustom !== undefined) updateData['customPricing.isCustom'] = isCustom;
  }

  // Handle selected package updates
  if (requestBody.selectedPackage !== undefined)
    updateData.selectedPackage = requestBody.selectedPackage;

  // Handle customer response updates
  if (requestBody.customerResponse) {
    const { approved, customerNotes } = requestBody.customerResponse;

    if (approved !== undefined) {
      updateData['customerResponse.approved'] = approved;
      updateData['customerResponse.responseDate'] = new Date();
    }
    if (customerNotes !== undefined)
      updateData['customerResponse.customerNotes'] = customerNotes;
  }

  // Handle timeline updates
  if (requestBody.estimatedDelivery !== undefined) {
    updateData.estimatedDelivery = requestBody.estimatedDelivery;
  }

  // Handle admin fields
  if (requestBody.adminNotes !== undefined)
    updateData.adminNotes = requestBody.adminNotes;
  if (requestBody.handledBy !== undefined)
    updateData.handledBy = requestBody.handledBy;

  return updateData;
};

/**
 * Generate quote email content
 * @param {Object} customOrder - Custom order document
 * @returns {Object} - Email content object
 */
const generateQuoteEmailContent = (customOrder) => {
  const { companyInfo, orderDetails, customPricing, selectedPackage } =
    customOrder;

  return {
    to: companyInfo.email,
    subject: `Custom NFC Cards Quote - ${companyInfo.companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Your Custom NFC Cards Quote</h2>
        
        <p>Dear ${companyInfo.contactPerson},</p>
        
        <p>Thank you for your interest in our custom NFC cards. We're pleased to provide you with the following quote:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Order Details</h3>
          <p><strong>Company:</strong> ${companyInfo.companyName}</p>
          <p><strong>Quantity:</strong> ${
            orderDetails.employeeCount
          } NFC cards</p>
          <p><strong>Price per card:</strong> ${pricing.pricePerCard} ${
      pricing.currency
    }</p>
          ${
            pricing.discountPercentage > 0
              ? `<p><strong>Bulk discount:</strong> ${pricing.discountPercentage}%</p>`
              : ''
          }
          <p><strong>Total Price:</strong> ${pricing.totalPrice} ${
      pricing.currency
    }</p>
          ${
            customOrder.estimatedDelivery
              ? `<p><strong>Estimated Delivery:</strong> ${customOrder.estimatedDelivery.toLocaleDateString()}</p>`
              : ''
          }
        </div>
        
        ${
          orderDetails.message
            ? `
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h4>Your Requirements:</h4>
            <p>${orderDetails.message}</p>
          </div>
        `
            : ''
        }
        
        <p>This quote is valid for 30 days. To proceed with your order, please reply to this email or contact us directly.</p>
        
        <p>If you have any questions or need modifications to this quote, please don't hesitate to reach out.</p>
        
        <p>Best regards,<br>
        LinkIt NFC Cards Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">
          This quote was generated automatically. Please contact us if you have any concerns.
        </p>
      </div>
    `,
  };
};

/**
 * Calculate estimated delivery date for custom orders
 * @param {number} quantity - Number of cards
 * @param {string} urgency - Order urgency level (standard, urgent, express)
 * @returns {Date} - Estimated delivery date
 */
const calculateCustomOrderDelivery = (quantity, urgency = 'standard') => {
  let baseDays = 10; // Base delivery time for custom orders

  // Adjust based on quantity
  if (quantity > 1000) baseDays += 3;
  if (quantity > 5000) baseDays += 7;

  // Adjust based on urgency
  switch (urgency) {
    case 'urgent':
      baseDays = Math.max(5, baseDays - 3);
      break;
    case 'express':
      baseDays = Math.max(3, baseDays - 5);
      break;
    default:
      break;
  }

  return new Date(Date.now() + baseDays * 24 * 60 * 60 * 1000);
};

/**
 * Get status display information
 * @param {string} status - Order status
 * @returns {Object} - Status display info
 */
const getStatusDisplayInfo = (status) => {
  const statusInfo = {
    pending: {
      label: 'Pending Review',
      color: 'orange',
      description: 'Your request has been received and is awaiting review',
    },
    reviewing: {
      label: 'Under Review',
      color: 'blue',
      description: 'Our team is reviewing your requirements',
    },
    quoted: {
      label: 'Quote Provided',
      color: 'purple',
      description: 'Quote has been sent to you for approval',
    },
    approved: {
      label: 'Approved',
      color: 'green',
      description: 'Quote approved and ready for production',
    },
    in_production: {
      label: 'In Production',
      color: 'blue',
      description: 'Your NFC cards are being manufactured',
    },
    completed: {
      label: 'Completed',
      color: 'green',
      description: 'Order completed and delivered',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'red',
      description: 'Order has been cancelled',
    },
  };

  return statusInfo[status] || statusInfo.pending;
};

module.exports = {
  setCustomOrderDefaults,
  getCustomOrderPopulationOptions,
  formatCustomOrderResponse,
  buildCustomOrderUpdateObject,
  generateQuoteEmailContent,
  calculateCustomOrderDelivery,
  getStatusDisplayInfo,
};
