import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import pool from "../config/db.config.js";
import constants from "../config/constants.config.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import { generateAuthToken, refresh_token } from "../utils/token.utils.js";
import expressAsyncHandler from "express-async-handler";
import logger from "../utils/logger.utils.js";

const sendotp = expressAsyncHandler(async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      return sendError(res, constants.VALIDATION_ERROR, "Email is required");
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in DB
    await pool.query(
      `INSERT INTO email_otps (email, otp_code, expires_at) VALUES ($1, $2, $3)`,
      [trimmedEmail, otp, expiresAt]
    );

    // Send OTP via email
    const subject = 'Verify Your Email - OTP Code';
    const html = `
      <p>We received a request to verify your email address.</p>
      <p><strong>Your OTP Code:</strong> <span style="font-size: 20px;">${otp}</span></p>
      <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>
      <br/>
      <p>If you did not request this, you can ignore this email.</p>
    `;

    await sendEmail(trimmedEmail, subject, html);

    return sendSuccess(res, constants.OK, "OTP sent successfully");
  } catch (error) {
    logger.error("Error sending OTP:", error);
    return sendServerError(res, error);
  }
});


const signup = expressAsyncHandler(async (req, res) => {
  try {
    let {
      firstName = "",
      lastName = "",
      phone,
      email,
      password,
      gender = "Other",
      dob = null,
      profilePic = "https://cdn-icons-png.flaticon.com/512/9131/9131529.png",
      location_latitude = null,
      location_longitude = null,
      isGoogleUser = false,
      otp = null,
    } = req.body;

    // Normalize email
    email = email?.trim().toLowerCase();
    if (!email) {
      return sendError(res, constants.VALIDATION_ERROR, "Email is required.");
    }

    // Validate required fields for normal signup
    if (!isGoogleUser && (!password || !phone)) {
      return sendError(res, constants.VALIDATION_ERROR, "Phone and password are required for signup.");
    }

    // Check if user already exists
    const { rows: existing } = await pool.query(
      `SELECT * FROM users WHERE email = $1 OR phone = $2`,
      [email, phone]
    );

    if (existing.length > 0) {
      const existingUser = existing[0];
      if (existingUser.is_google_user) {
        // Google login fallback
        const token = await generateAuthToken({ user_id: existingUser.user_id });
        const refreshTokenValue = await refresh_token({ user_id: existingUser.user_id });

        res.cookie("refreshToken", refreshTokenValue, {
          httpOnly: true,
          secure: true,
          sameSite: "Strict",
          maxAge: 365 * 24 * 60 * 60 * 1000,
        });

        return sendSuccess(res, constants.OK, "User logged in successfully", {
          user: {
            user_id: existingUser.user_id,
            first_name: existingUser.first_name,
            last_name: existingUser.last_name,
            email: existingUser.email,
            phone: existingUser.phone,
            gender: existingUser.gender,
            dob: existingUser.dob,
            profile_pic: existingUser.profile_pic,
          },
          token,
        });
      }

      return sendError(res, constants.CONFLICT, "User already exists with this email or phone.");
    }

    // OTP validation for non-Google user
    if (!isGoogleUser) {
      if (!otp) {
        return sendError(res, constants.VALIDATION_ERROR, "OTP is required for signup.");
      }

      const { rows: otpRows } = await pool.query(
        `SELECT * FROM email_otps WHERE email = $1 AND otp_code = $2 AND expires_at > NOW()`,
        [email, otp]
      );

      if (otpRows.length === 0) {
        return sendError(res, constants.UNAUTHORIZED, "Invalid or expired OTP.");
      }

      // Mark OTP as verified
      await pool.query(`UPDATE email_otps SET verified = true WHERE email = $1`, [email]);
    }

    // Create new user
    const user_id = uuidv4();
    const hashedPassword = isGoogleUser ? null : await bcrypt.hash(password, 10);

    const insertUserQuery = `
      INSERT INTO users (
        user_id, first_name, last_name, phone, email, password, gender, dob,
        profile_pic, location_latitude, location_longitude, is_google_user
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING user_id, first_name, last_name, phone, email, gender, dob, profile_pic
    `;

    const { rows } = await pool.query(insertUserQuery, [
      user_id,
      firstName,
      lastName,
      phone || null,
      email,
      hashedPassword,
      gender,
      dob,
      profilePic,
      location_latitude,
      location_longitude,
      isGoogleUser,
    ]);

    const user = rows[0];
    const token = await generateAuthToken({ user_id });
    const refreshTokenValue = await refresh_token({ user_id });

    res.cookie("refreshToken", refreshTokenValue, {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    return sendSuccess(res, constants.CREATED, "User registered successfully", {
      user,
      token,
    });
  } catch (error) {
    logger.error("Signup error:", error.message);
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
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "Invalid email or password"
      );
    }

    const user = rows[0];

    // Check if password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "Invalid email or password"
      );
    }

    // Generate token
    const token = await generateAuthToken({ user_id: user.user_id });
    const refreshtoken = await refresh_token({ user_id: user.user_id });
    // Remove password from response data
    delete user.password;
    // Set refreshToken in HttpOnly cookie
    res.cookie("refreshToken", refreshtoken, {
      httpOnly: true,
      secure: true, // Set to true in production with HTTPS
      sameSite: "Strict",
      maxAge: 365 * 24 * 60 * 60 * 1000, // 30 days
    });
    return sendSuccess(res, constants.OK, "Login successful", { user, token });
  } catch (error) {
    logger.error(error.message);
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
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Email and password are required."
      );
    }

    // Check if superadmin already exists
    const checkQuery = "SELECT * FROM superadmin WHERE email = $1";
    const { rows } = await pool.query(checkQuery, [email]);

    if (rows.length > 0) {
      return sendError(
        res,
        constants.CONFLICT,
        "Superadmin already exists with this email."
      );
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

    const result = await pool.query(insertQuery, [
      superadmin_id,
      email,
      hashedPassword,
    ]);
    const superadmin = result.rows[0];

    // Optionally generate a token if needed
    const token = await generateAuthToken({
      superadmin_id: superadmin.superadmin_id,
    });

    return sendSuccess(
      res,
      constants.CREATED,
      "Superadmin created successfully",
      { superadmin, token }
    );
  } catch (error) {
    logger.error(error.message);
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
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Email and password are required."
      );
    }

    // Check if superadmin exists
    const query = "SELECT * FROM superadmin WHERE email = $1";
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return sendError(
        res,
        constants.NOT_FOUND,
        "Superadmin account not found."
      );
    }

    const superadmin = rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, superadmin.password);
    if (!isMatch) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid credentials.");
    }

    // Generate token
    const token = await generateAuthToken({
      superadmin_id: superadmin.superadmin_id,
    });

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
    logger.error(error.message);
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
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Email and password are required."
      );
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
      return sendError(
        res,
        constants.UNAUTHORIZED,
        "Your account is not verified yet."
      );
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, centre.password);
    if (!isMatch) {
      return sendError(res, constants.UNAUTHORIZED, "Invalid credentials.");
    }

    // Generate token
    const token = await generateAuthToken({
      medicalcentre_id: centre.medicalcentre_id,
    });
    delete centre.password;
    // Return public info and token
    return sendSuccess(res, constants.OK, "Login successful", {
      centre,
      token,
    });
  } catch (error) {
    logger.error("Logging error for medical centre:", error.message);
    return sendServerError(res, error);
  }
});

export default {
  sendotp,
  signup,
  login,
  superadminsignup,
  superadminlogin,
  medicalCentreLogin,
};
