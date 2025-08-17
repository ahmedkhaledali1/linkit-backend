const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;

    console.log('file..', file);
    // Create subdirectories based on file type or route
    if (file.fieldname === 'images') {
      uploadPath = path.join(uploadsDir, 'images');
    } else if (file.fieldname === 'documents') {
      uploadPath = path.join(uploadsDir, 'documents');
    } else if (file.fieldname === 'image') {
      uploadPath = path.join(uploadsDir, 'images');
    } else if (file.fieldname === 'companyLogo') {
      uploadPath = path.join(uploadsDir, 'companyLogo');
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

// Helper function to get file path for database storage
const getRelativeFilePath = (file) => {
  if (!file) return null;

  // Return path relative to public folder
  const publicIndex = file.path.indexOf('public');
  if (publicIndex !== -1) {
    return file.path.substring(publicIndex + 6); // Remove 'public' from path
  }
  return file.filename;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '../public', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
  return false;
};

module.exports = {
  uploadImage,
  uploadGeneral,
  getRelativeFilePath,
  deleteFile,
  uploadCompanyLogo: uploadImage.single('companyLogo'),
  uploadMultipleImages: uploadImage.array('images', 10),
};
