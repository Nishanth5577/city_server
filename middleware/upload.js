const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImages = /jpeg|jpg|png|gif|webp|svg/;
  const allowedDocs = /pdf|doc|docx|xls|xlsx|csv|dwg|dxf|ppt|pptx/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (allowedImages.test(ext) || allowedDocs.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${ext} is not allowed.`), false);
  }
};

// Image-only filter
const imageFilter = (req, file, cb) => {
  const allowedImages = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');

  if (allowedImages.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'), false);
  }
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024; // 10MB

// General upload (images + docs)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSize },
});

// Image-only upload
const uploadImage = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for images
});

module.exports = { upload, uploadImage };
