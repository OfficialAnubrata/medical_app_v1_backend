import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import pool from "../config/db.config.js";
import constants from "../config/constants.config.js";
import { sendSuccess, sendError, sendServerError } from "../utils/response.utils.js";
import { generateAuthToken } from "../utils/token.utils.js";
import expressAsyncHandler from "express-async-handler";

const signup = expressAsyncHandler(async (req, res) => {
  let {
    firstName = "",
    lastName = "",
    phone,
    email,
    password,
    gender = 'Other',
    dob = null,
    profilePic = "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
    location_latitude = null,
    location_longitude = null,
    isGoogleUser = false,
  } = req.body;

  try {
    // Validate required fields
    if (!phone || !email || !password) {
      return sendError(res, constants.VALIDATION_ERROR, "Phone, email, and password are required.");
    }

    // Check if user already exists
    const checkQuery = "SELECT * FROM users WHERE email = $1 OR phone = $2";
    const { rows } = await pool.query(checkQuery, [email, phone]);

    if (rows.length > 0) {
      return sendError(res, constants.CONFLICT, "User already exists with given email or phone");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id = uuidv4();

    // Insert user into DB
    const insertQuery = `
      INSERT INTO users (
        user_id, first_name, last_name, phone, email, password, gender, dob,
        profile_pic, location_latitude, location_longitude, is_google_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING user_id, first_name, last_name, phone, email, gender, dob, profile_pic
    `;

    const values = [
      user_id,
      firstName,
      lastName,
      phone,
      email,
      hashedPassword,
      gender,
      dob,
      profilePic,
      location_latitude,
      location_longitude,
      isGoogleUser,
    ];

    const result = await pool.query(insertQuery, values);
    const user = result.rows[0];
    const token = await generateAuthToken({ user_id });

    return sendSuccess(res, constants.CREATED, "User created successfully", { user, token });
  } catch (error) {
    logger.info(error.message)
    return sendServerError(res, error);
  }
});

const login = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const query = "SELECT * FROM users WHERE email = $1";
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid email or password");
    }

    const user = rows[0];

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid email or password");
    }

    // Generate token
    const token = await generateAuthToken({ user_id:user.user_id });

    // Remove password from response data
    delete user.password;

    return sendSuccess(res, constants.OK, "Login successful", { user, token });
  } catch (error) {
    logger.info(error.message)
    return sendServerError(res, error);
  }
});

export default {
    signup,
    login
}