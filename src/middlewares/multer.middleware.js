// fileUploader.js (or .mjs if not using "type": "module" in package.json)

import multer from 'multer';
import path from 'path';

// Set up Multer storage configuration
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, path.join('src','uploads/'));
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname); // e.g., .pdf
    const timestamp = Date.now();
    cb(null, `prescription_${timestamp}${ext}`);
  }
});

const upload = multer({ storage });

export { upload };
