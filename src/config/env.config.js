import dotenv from "dotenv";

dotenv.config();

const variable = {
    database_url: process.env.DATABASE_URL, // use all-caps with underscores (best practice)
    jwt_secret: process.env.JWT_SECRET,
    expery_time: process.env.JWT_EXPIRY_TIME
};

export default variable;

