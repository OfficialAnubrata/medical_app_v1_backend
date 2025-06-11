import dotenv from "dotenv";

dotenv.config();

const variable = {
    database_url: process.env.DATABASE_URL, // use all-caps with underscores (best practice)
    jwt_secret: process.env.JWT_SECRET,
    expery_time: process.env.JWT_EXPIRY_TIME,
    gmail: process.env.NODEMAILER_GMAIL,
    gmail_password: process.env.NODEMAILER_GMAIL_PASS,
    refresh_token: process.env.REFESH_TOKEN_SECRET,
    cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
    cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET
};

export default variable;

