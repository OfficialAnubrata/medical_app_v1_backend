import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import pool from "../config/db.config.js";
import constants from "../config/constants.config.js";
import { sendSuccess, sendError, sendServerError } from "../utils/response.utils.js";
import { generateAuthToken } from "../utils/token.utils.js";
import expressAsyncHandler from "express-async-handler";
import logger from "../utils/logger.utils.js";

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
    // Normalize email
    email = email?.trim().toLowerCase();
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
  let { email, password } = req.body;

  try {
    // Normalize email
    email = email?.trim().toLowerCase();
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

const superadminsignup = expressAsyncHandler(async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize email
    email = email?.trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return sendError(res, constants.VALIDATION_ERROR, "Email and password are required.");
    }

    // Check if superadmin already exists
    const checkQuery = "SELECT * FROM superadmin WHERE email = $1";
    const { rows } = await pool.query(checkQuery, [email]);

    if (rows.length > 0) {
      return sendError(res, constants.CONFLICT, "Superadmin already exists with this email.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const superadmin_id = uuidv4();

    // Insert superadmin into DB
    const insertQuery = `
      INSERT INTO superadmin (superadmin_id, email, password)
      VALUES ($1, $2, $3)
      RETURNING superadmin_id, email, created_at
    `;

    const result = await pool.query(insertQuery, [superadmin_id, email, hashedPassword]);
    const superadmin = result.rows[0];

    // Optionally generate a token if needed
    const token = await generateAuthToken({ superadmin_id: superadmin.superadmin_id });

    return sendSuccess(res, constants.CREATED, "Superadmin created successfully", { superadmin, token });

  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const superadminlogin = expressAsyncHandler(async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize email
    email = email?.trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return sendError(res, constants.VALIDATION_ERROR, "Email and password are required.");
    }

    // Check if superadmin exists
    const query = "SELECT * FROM superadmin WHERE email = $1";
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return sendError(res, constants.NOT_FOUND, "Superadmin account not found.");
    }

    const superadmin = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, superadmin.password);
    if (!isMatch) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid credentials.");
    }

    // Generate token
    const token = await generateAuthToken({ superadmin_id: superadmin.superadmin_id });

    // Return minimal public info and token
    return sendSuccess(res, constants.OK, "Login successful", {
      superadmin: {
        superadmin_id: superadmin.superadmin_id,
        email: superadmin.email,
        created_at: superadmin.created_at,
      },
      token,
    });

  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const medicalCentreLogin = expressAsyncHandler(async (req, res) => {
  try {
    let { email, password } = req.body;

    // Normalize email
    email = email?.trim().toLowerCase();

    // Validate input
    if (!email || !password) {
      return sendError(res, constants.VALIDATION_ERROR, "Email and password are required.");
    }

    // Check if medical centre exists
    const query = "SELECT * FROM medical_centre WHERE email = $1";
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return sendError(res, constants.NOT_FOUND, "Medical centre not found.");
    }

    const centre = rows[0];

    // Check if account is verified
    if (!centre.is_verified) {
      return sendError(res, constants.UNAUTHORIZED, "Your account is not verified yet.");
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, centre.password);
    if (!isMatch) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid credentials.");
    }

    // Generate token
    const token = await generateAuthToken({ medicalcentre_id: centre.medicalcentre_id });
    delete centre.password;
    // Return public info and token
    return sendSuccess(res, constants.OK, "Login successful", {
      centre,
      token,
    });

  } catch (error) {
    logger.info("Logging error for medical centre:", error.message);
    return sendServerError(res, error);
  }
});

export default {
    signup,
    login,
    superadminsignup,
    superadminlogin,
    medicalCentreLogin

}