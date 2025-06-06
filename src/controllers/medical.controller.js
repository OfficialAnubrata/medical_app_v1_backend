import pool from "../config/db.config.js";
import constants from "../config/constants.config.js";
import bcrypt from "bcrypt";
import {
  sendSuccess,
  sendError,
  sendServerError,
} from "../utils/response.utils.js";
import expressAsyncHandler from "express-async-handler";
import logger from "../utils/logger.utils.js";
import cryptoRandomString from "crypto-random-string";
import { sendEmail } from "../utils/sendEmail.utils.js";
import { haversine } from "../utils/calculatedistance.utils.js";

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


const verifyCentre = expressAsyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    const { is_verified } = req.body;
    const { medicalCentreId } = req.params;

    if (typeof is_verified !== "boolean") {
      return sendError(res, constants.VALIDATION_ERROR, "'is_verified' must be a boolean.");
    }

    let plainPassword = null;
    let hashedPassword = null;

    if (is_verified) {
      plainPassword = cryptoRandomString({ length: 8, type: "alphanumeric" });
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    }

    await client.query("BEGIN");

    let result;

    if (is_verified) {
      const query = `
        UPDATE medical_centre
        SET is_verified = $1, password = $2
        WHERE medicalcentre_id = $3
        RETURNING *;
      `;
      const values = [true, hashedPassword, medicalCentreId];
      result = await client.query(query, values);
    } else {
      const query = `
        UPDATE medical_centre
        SET is_verified = $1
        WHERE medicalcentre_id = $2
        RETURNING *;
      `;
      const values = [false, medicalCentreId];
      result = await client.query(query, values);
    }

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return sendError(res, constants.NOT_FOUND, "Medical centre not found.");
    }

    const medicalCentre = result.rows[0];

    if (is_verified && medicalCentre.email) {
      const subject = 'Your medical centre has been approved';
      const html = `
        <p>Your medical centre has been successfully verified.</p>
        <p><strong>Temporary Password:</strong> ${plainPassword}</p>
        <p>Please change it immediately after logging in for security reasons.</p>
      `;

      await sendEmail(medicalCentre.email, subject, html);
    }

    await client.query("COMMIT");

    return sendSuccess(
      res,
      constants.OK,
      is_verified
        ? "Verification status updated and password emailed."
        : "Verification status updated.",
      medicalCentre
    );
  } catch (error) {
    await client.query("ROLLBACK");
    logger.info("verifyCentre error:", error.message);
    return sendServerError(res, error);
  } finally {
    client.release();
  }
});

const getAllMedicalCentres = expressAsyncHandler(async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    // Count total medical centres
    const countResult = await pool.query(`SELECT COUNT(*) FROM medical_centre`);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Fetch paginated data
    const result = await pool.query(
      `SELECT * FROM medical_centre ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return sendSuccess(res, constants.OK, "Medical centres fetched successfully", {
      data: result.rows,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const getNearestMedicalCentres = expressAsyncHandler(async (req, res) => {
  try {
    const { latitude, longitude, radius = 10 } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.toLowerCase() || null;

    if (!latitude || !longitude) {
      return sendError(res, constants.VALIDATION_ERROR, 'Latitude and longitude are required.');
    }

    if (page < 1 || limit < 1) {
      return sendError(res, constants.VALIDATION_ERROR, "Page and limit must be positive integers.");
    }

    // Step 1: Fetch medical centres with location
    const result = await pool.query(`
      SELECT mc.*, COUNT(mt.medical_test_id) AS total_tests
      FROM medical_centre mc
      LEFT JOIN medical_test mt ON mc.medicalcentre_id = mt.medicalcentre_id
      WHERE mc.mclatitude IS NOT NULL AND mc.mclongitude IS NOT NULL
      GROUP BY mc.medicalcentre_id
    `);

    // Step 2: Process distance, filter radius & search
    const nearest = result.rows
      .map((centre) => {
        const distance = haversine(latitude, longitude, centre.mclatitude, centre.mclongitude);
        return { ...centre, distance };
      })
      .filter((centre) => centre.distance <= radius)
      .filter((centre) => {
        if (!search) return true;
        return centre.medicalcentre_name?.toLowerCase().includes(search);
      })
      .sort((a, b) => a.distance - b.distance);

    // Step 3: Pagination
    const startIndex = (page - 1) * limit;
    const paginatedData = nearest.slice(startIndex, startIndex + limit);

    // Step 4: Random value (for use case mentioned earlier)
    const randomValue = Math.floor(Math.random() * 4) + 1;

    // Step 5: Return response
    return sendSuccess(res, constants.OK, "Nearest medical centres fetched successfully", {
      data: paginatedData,
      totalCount: nearest.length,
      totalPages: Math.ceil(nearest.length / limit),
      currentPage: page,
      radiusKm: radius,
      randomValue,
    });

  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});



const deleteMedicalCentre = expressAsyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return sendError(res, constants.VALIDATION_ERROR, "Medical centre ID is required.");
    }

    // Attempt delete and get deleted row
    const result = await pool.query(
      `DELETE FROM medical_centre WHERE medicalcentre_id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return sendError(res, constants.NOT_FOUND, "Medical centre not found.");
    }

    return sendSuccess(res, constants.OK, "Medical centre deleted successfully.", {
      deleted: result.rows[0],
    });

  } catch (error) {
    logger.error(`Delete Medical Centre Error: ${error.message}`);
    return sendServerError(res, error);
  }
});

const getMedicalCentreSummary = expressAsyncHandler(async (req, res) => {
  try {
    const { medicalcentre_id } = req.params;

    if (!medicalcentre_id) {
      return sendError(res, constants.VALIDATION_ERROR, "Medical centre ID is required.");
    }

    const query = `
      SELECT 
        mc.medicalcentre_name,
        mc.address_line,
        mc.area,
        mc.district,
        mc.state,
        mc.pincode,
        COUNT(DISTINCT mt.test_id) AS total_tests,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT tc.type_of_test), NULL) AS types_of_tests
      FROM medical_centre mc
      LEFT JOIN medical_test mt ON mc.medicalcentre_id = mt.medicalcentre_id
      LEFT JOIN test_catalog tc ON mt.test_id = tc.test_id
      WHERE mc.medicalcentre_id = $1
      GROUP BY mc.medicalcentre_id
    `;

    const result = await pool.query(query, [medicalcentre_id]);

    if (result.rowCount === 0) {
      return sendError(res, constants.NOT_FOUND, "Medical centre not found.");
    }

    return sendSuccess(res, constants.OK, "Medical centre summary fetched successfully.", result.rows[0]);

  } catch (error) {
    logger.info(error.message);
    return sendError(res, constants.SERVER_ERROR, "Something went wrong.");
  }
});

export default {
  addmedicalcentre,
  verifyCentre,
  getAllMedicalCentres,
  getNearestMedicalCentres,
  deleteMedicalCentre,
  getMedicalCentreSummary
};
