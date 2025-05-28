import pool from "../config/db.config.js";
import constants from "../config/constants.config.js";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import expressAsyncHandler from "express-async-handler";
import logger from "../utils/logger.utils.js";

const addmedicalcentre = expressAsyncHandler(async (req, res) => {
  try {
    let {
      medicalcentre_name,
      registration_number,
      mobile_no,
      email,
      address_line,
      area,
      district,
      state,
      pincode,
    } = req.body;
    if (!medicalcentre_name || !registration_number || !mobile_no || !email) {
      return sendError(
        res,
        constants.VALIDATION_ERROR,
        "Medical centre Name and registration number, email & phonenumber required"
      );
    }
    const logo = "https://cdn-icons-png.flaticon.com/512/9131/9131529.png";
    // Normalize email
    email = email?.trim().toLowerCase();
    // Check if a centre with the same email, phone or registration number exists
    const existingCentre = await pool.query(
      `SELECT * FROM medical_centre WHERE email = $1 OR mobile_no = $2 OR registration_number = $3`,
      [email, mobile_no, registration_number]
    );

    if (existingCentre.rows.length > 0) {
      return sendError(
        res,
        constants.CONFLICT,
        "Medical centre with same email, phone, or registration number already exists"
      );
    }

    // Generate unique ID (you can use UUID if preferred)
    const medicalcentre_id = `MC-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO medical_centre 
            (medicalcentre_id, medicalcentre_name, registration_number, logo, mobile_no, email, address_line, area, district, state, pincode) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        medicalcentre_id,
        medicalcentre_name,
        registration_number,
        logo,
        mobile_no.trim(),
        email,
        address_line || null,
        area || null,
        district || null,
        state || null,
        pincode || null,
      ]
    );

    return sendSuccess(
      res,
      constants.CREATED,
      "medical centre added success fully",
      result.rows[0]
    );
  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});



export default {
  addmedicalcentre,
};
