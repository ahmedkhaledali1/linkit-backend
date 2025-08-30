const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists - use a persistent path outside the project root
const uploadsDir =
  process.env.UPLOADS_DIR || path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    // Determine subdirectory based on fieldname
    if (file.fieldname === 'images' || file.fieldname === 'image') {
      uploadPath = path.join(uploadsDir, 'images');
    } else if (file.fieldname === 'documents') {
      uploadPath = path.join(uploadsDir, 'documents');
    } else if (file.fieldname === 'companyLogo') {
      uploadPath = path.join(uploadsDir, 'companyLogo');
    } else if (file.fieldname === 'despositeTransactionImg') {
      uploadPath = path.join(uploadsDir, 'despositeTransactionImg');
    } else if (file.fieldname === 'addonImages') {
      uploadPath = path.join(uploadsDir, 'addonImages');
    } else {
      uploadPath = path.join(uploadsDir, 'general');
    }

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'),
      false
    );
  }
};

// General file filter
const generalFilter = (req, file, cb) => {
  // Add any file type restrictions here
  cb(null, true);
};

// Multer configurations
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  //   limits: {
  //     fileSize: 5 * 1024 * 1024, // 5MB limit
  //   },
});

const uploadGeneral = multer({
  storage: storage,
  fileFilter: generalFilter,
  //   limits: {
  //     fileSize: 10 * 1024 * 1024, // 10MB limit
  //   },
});

// Combined upload function for orders (handles both companyLogo and addonImages)
const uploadOrderFiles = multer({
  storage: storage,
  fileFilter: imageFilter,
}).fields([
  { name: 'companyLogo', maxCount: 1 },
  { name: 'despositeTransactionImg', maxCount: 1 },
  { name: 'addonImages', maxCount: 10 },
]);

// Helper function to get file path for database storage
const getRelativeFilePath = (file) => {
  if (!file) return null;

  // If using UPLOADS_DIR environment variable, return the subdirectory path
  if (process.env.UPLOADS_DIR) {
    // Extract the subdirectory path (e.g., 'images', 'companyLogo', etc.)
    const uploadsDir = process.env.UPLOADS_DIR;
    const filePath = file.path;

    // Find the subdirectory after the uploads directory
    const uploadsIndex = filePath.indexOf(uploadsDir);
    if (uploadsIndex !== -1) {
      const relativePath = filePath.substring(
        uploadsIndex + uploadsDir.length + 1
      ); // +1 for the slash
      return relativePath;
    }
  }

  // Fallback for local development (public/uploads structure)
  const publicIndex = file.path.indexOf('public');
  if (publicIndex !== -1) {
    return file.path.substring(publicIndex + 6); // Remove 'public' from path
  }

  return file.filename;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    let fullPath;

    // If using UPLOADS_DIR environment variable
    if (process.env.UPLOADS_DIR) {
      fullPath = path.join(process.env.UPLOADS_DIR, filePath);
    } else {
      // Fallback for local development
      fullPath = path.join(__dirname, '../public', filePath);
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

// Flexible upload function that handles both single and multiple files
const createFlexibleUpload = (fieldName, maxCount = 1) => {
  if (maxCount === 1) {
    return uploadImage.single(fieldName);
  } else {
    return uploadImage.array(fieldName, maxCount);
  }
};

// Pre-configured flexible uploads
const flexibleUploads = {
  // Single file uploads
  companyLogo: createFlexibleUpload('companyLogo', 1),
  singleImage: createFlexibleUpload('image', 1),

  // Multiple file uploads
  addonImages: createFlexibleUpload('addonImages', 10),
  multipleImages: createFlexibleUpload('images', 10),
  documents: createFlexibleUpload('documents', 5),

  // Combined uploads for specific use cases
  orderFiles: uploadOrderFiles,

  // Dynamic upload function that can be used for any field
  dynamic: (fieldName, maxCount = 1) =>
    createFlexibleUpload(fieldName, maxCount),
};

module.exports = {
  uploadImage,
  uploadGeneral,
  getRelativeFilePath,
  deleteFile,
  // Legacy exports for backward compatibility
  uploadCompanyLogo: uploadImage.single('companyLogo'),
  uploadAddonImages: uploadImage.array('addonImages', 10),
  uploadMultipleImages: uploadImage.array('images', 10),
  // New flexible upload system
  ...flexibleUploads,
};
