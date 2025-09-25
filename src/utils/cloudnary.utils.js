// cloudinaryUploader.mjs or cloudinaryUploader.js (with "type": "module" in package.json)

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import variable from '../config/env.config.js';

dotenv.config();

cloudinary.config({
  cloud_name: variable.cloudinary_cloud_name,
  api_key: variable.cloudinary_api_key,
  api_secret: variable.cloudinary_api_secret
});

const uploadToCloudinary = async (filePath, folderName) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folderName,
      resource_type: "raw", // For PDFs and other non-image files
      access_mode: "public" // 👈 ensures it's accessible via direct link
    });
    return { success: true, url: result.secure_url };
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    return { success: false, error: error.message };
  }
};

export { uploadToCloudinary };
