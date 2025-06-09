import expressAsyncHandler from "express-async-handler";
import {
    sendError,
    sendServerError,
    sendSuccess,
} from "../utils/response.utils.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.utils.js";
import constants from "../config/constants.config.js";
import pool from "../config/db.config.js";
import { addAddressSchema, patientSchema } from "../validators/testCatalog.Validators.js";

const addPatient = expressAsyncHandler(async (req, res) => {
    try {
        const { error, value } = patientSchema.validate(req.body);
        if (error) {
            return sendError(
                res,
                constants.VALIDATION_ERROR,
                error.details[0].message
            );
        }
        const user_id = req.user?.user_id; // ✅ Extracted from JWT
        if (!user_id) {
            return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
        }

        const { full_name, gender, dob, relation } = value;

        const patient_id = uuidv4();

        const insertQuery = `
            INSERT INTO patients (patient_id, user_id, full_name, gender, dob, relation)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;

        const values = [patient_id, user_id, full_name, gender, dob, relation];

        const result = await pool.query(insertQuery, values);

        return sendSuccess(
            res,
            constants.CREATED,
            "Patient added successfully",
            result.rows[0]
        );
    } catch (error) {
        logger.info(`Add Patient Error: ${error.message}`);
        return sendServerError(res, error);
    }
});

const getAllPatients = expressAsyncHandler(async (req, res) => {
    try {
        const user_id = req.user?.user_id;

        if (!user_id) {
            return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
        }

        // Calculate age on the fly with PostgreSQL's AGE + DATE_PART
        const result = await pool.query(
            `
      SELECT
        patient_id,
        full_name,
        gender,
        dob,
        DATE_PART('year', AGE(CURRENT_DATE, dob)) AS age,  -- 🎯 calculated age
        relation,
        created_at
      FROM patients
      WHERE user_id = $1
      ORDER BY created_at DESC;
      `,
            [user_id]
        );

        return sendSuccess(res, constants.OK, "Patients fetched successfully", {
            count: result.rowCount,
            patients: result.rows, // each row now has an "age" field
        });
    } catch (err) {
        console.error(err.message);
        return sendServerError(res, err);
    }
});

const addAddress = expressAsyncHandler(async (req, res) => {
    try {
        const { error, value } = addAddressSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }
        const user_id = req.user?.user_id;
        if (!user_id) {
            return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
        }

        const {
            label,
            address_line,
            area,
            city,
            district,
            state,
            pincode,
            landmark,
            contact_number,
            latitude,
            longitude,
        } = value;

        if (!address_line) {
            return sendError(
                res,
                constants.VALIDATION_ERROR,
                "Address line is required"
            );
        }

        // Generate new address_id
        const address_id = uuidv4();

        const query = `
      INSERT INTO addresses (
        address_id, user_id, label, address_line, area, city, district, state, pincode, landmark, contact_number, latitude, longitude
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `;

        const values = [
            address_id,
            user_id,
            label || null,
            address_line,
            area || null,
            city || null,
            district || null,
            state || null,
            pincode || null,
            landmark || null,
            contact_number || null,
            latitude || null,
            longitude || null,
        ];

        const { rows } = await pool.query(query, values);

        return sendSuccess(
            res,
            constants.CREATED,
            "Address added successfully",
            rows[0]
        );
    } catch (error) {
        console.error(error);
        return sendServerError(res, error);
    }
});
const getAllAddresses = expressAsyncHandler(async (req, res) => {
  try {
    const user_id = req.user?.user_id;

    if (!user_id) {
      return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
    }

    const result = await pool.query(
      `SELECT 
         address_id, label, address_line, area, city, district, 
         state, pincode, landmark, contact_number, latitude, longitude, created_at 
       FROM addresses 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user_id]
    );

    return sendSuccess(res, constants.OK, "Addresses fetched successfully", {
      count: result.rowCount,
      addresses: result.rows
    });

  } catch (err) {
    console.error(err.message);
    return sendServerError(res, err);
  }
});
export default {
    addAddress,
    addPatient,
    getAllPatients,
    getAllAddresses
};
