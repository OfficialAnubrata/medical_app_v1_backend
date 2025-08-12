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
import { uploadToCloudinary } from "../utils/cloudnary.utils.js";

const addPatient = expressAsyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    // 1. Validate input
    const { error, value } = patientSchema.validate(req.body);
    if (error) {
      return sendError(res, constants.VALIDATION_ERROR, error.details[0].message);
    }

    const user_id = req.user?.user_id;
    if (!user_id) {
      return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
    }

    const { full_name, gender, dob, relation } = value;
    const patient_id = uuidv4();
    const prescription = req.file;

    await client.query("BEGIN");

    // 2. Insert patient
    const insertPatientQuery = `
      INSERT INTO patients (patient_id, user_id, full_name, gender, dob, relation)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING patient_id, full_name, gender, dob, relation, created_at
    `;
    const patientValues = [
      patient_id,
      user_id,
      full_name.trim(),
      gender,
      dob,
      relation?.trim() || null,
    ];
    const { rows: [patient] } = await client.query(insertPatientQuery, patientValues);

    // 3. If prescription file exists, upload and insert
    let prescription_url = null;

    if (prescription) {
      const { success, url, error } = await uploadToCloudinary(prescription.path, "prescriptions");
      if (!success) {
        await client.query("ROLLBACK");
        return sendError(res, constants.INTERNAL_SERVER_ERROR, `Cloudinary upload failed: ${error}`);
      }

      prescription_url = url;
      const prescription_id = uuidv4();

      const prescriptionresult = await client.query(`
        INSERT INTO prescriptions (prescription_id, patient_id, prescription_file)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [prescription_id, patient_id, prescription_url]);
    }

    await client.query("COMMIT");

    return sendSuccess(res, constants.CREATED, "Patient added successfully", {
      ...patient,
      ...(prescription_url ? { prescriptions: [{ prescription_file: prescription_url }] } : {})
    });

  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Add Patient Error:", error.message);
    return sendServerError(res, error);
  } finally {
    client.release();
  }
});


const getAllPatients = expressAsyncHandler(async (req, res) => {
  try {
    const user_id = req.user?.user_id;

    if (!user_id) {
      return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
    }

    const result = await pool.query(
      `
      SELECT
        p.patient_id,
        p.full_name,
        p.gender,
        p.dob,
        DATE_PART('year', AGE(CURRENT_DATE, p.dob)) AS age,
        p.relation,
        p.created_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'prescription_id', pr.prescription_id,
              'prescription_file', pr.prescription_file,
              'uploaded_at', pr.created_at
            )
          ) FILTER (WHERE pr.prescription_id IS NOT NULL),
          '[]'
        ) AS prescriptions
      FROM patients p
      LEFT JOIN prescriptions pr ON pr.patient_id = p.patient_id
      WHERE p.user_id = $1
      GROUP BY p.patient_id
      ORDER BY p.created_at DESC;
      `,
      [user_id]
    );

    return sendSuccess(res, constants.OK, "Patients fetched successfully", {
      count: result.rowCount,
      patients: result.rows, // Each patient includes a `prescriptions` array
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

const addPrescription = expressAsyncHandler(async (req, res) => {
  try {
    const patient_id  = req.params.patient_id;
    const prescription = req.file;

    if (!patient_id) {
      return sendError(res, constants.VALIDATION_ERROR, "Patient ID is required.");
    }

    if (!prescription) {
      return sendError(res, constants.VALIDATION_ERROR, "Prescription file is required.");
    }

    // ✅ Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(prescription.path, "prescriptions");

    if (!uploadResult.success) {
      return sendError(res, constants.SERVER_ERROR, "Failed to upload to Cloudinary.");
    }

    const prescription_id = uuidv4();
    const prescription_file = uploadResult.url;

    const insertQuery = `
      INSERT INTO prescriptions (
        prescription_id, patient_id, prescription_file
      ) VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result =await pool.query(insertQuery, [prescription_id, patient_id, prescription_file]);

    return sendSuccess(
      res,
      constants.CREATED,
      "Prescription uploaded successfully.",
      result.rows[0]
    );
  } catch (error) {
    console.error("Prescription Upload Error:", error);
    return sendServerError(res, error);
  }
});

const editPatient = expressAsyncHandler(async (req, res) => {
  const client = await pool.connect();

  try {
    // 1. Validate request body
    const { error, value } = patientSchema.validate(req.body, { allowUnknown: true });
    if (error) {
      return sendError(res, constants.VALIDATION_ERROR, error.details[0].message);
    }

    const user_id = req.user?.user_id;
    if (!user_id) {
      return sendError(res, constants.UNAUTHORIZED, "User not authenticated");
    }

    const { patient_id } = req.params;
    if (!patient_id) {
      return sendError(res, constants.VALIDATION_ERROR, "Patient ID is required");
    }

    const { full_name, gender, dob, relation } = value;
    const prescription = req.file;

    await client.query("BEGIN");

    // 2. Check if patient exists and belongs to the user
    const existingPatient = await client.query(
      `SELECT 1 FROM patients WHERE patient_id = $1 AND user_id = $2`,
      [patient_id, user_id]
    );
    if (existingPatient.rows.length === 0) {
      await client.query("ROLLBACK");
      return sendError(res, constants.NOT_FOUND, "Patient not found or unauthorized");
    }

    // 3. Build dynamic patient update query
    const updateFields = [];
    const updateValues = [];
    let idx = 1;

    if (full_name !== undefined) {
      updateFields.push(`full_name = $${idx++}`);
      updateValues.push(full_name.trim());
    }
    if (gender !== undefined) {
      updateFields.push(`gender = $${idx++}`);
      updateValues.push(gender);
    }
    if (dob !== undefined) {
      updateFields.push(`dob = $${idx++}`);
      updateValues.push(dob);
    }
    if (relation !== undefined) {
      updateFields.push(`relation = $${idx++}`);
      updateValues.push(relation.trim());
    }

    if (updateFields.length > 0) {
      updateValues.push(patient_id, user_id);
      await client.query(
        `UPDATE patients 
         SET ${updateFields.join(", ")} 
         WHERE patient_id = $${idx++} AND user_id = $${idx}`,
        updateValues
      );
    }

    // 4. Handle prescription update
    if (prescription) {
      const { success, url, error: uploadError } = await uploadToCloudinary(prescription.path, "prescriptions");
      if (!success) {
        await client.query("ROLLBACK");
        return sendError(res, constants.INTERNAL_SERVER_ERROR, `Cloudinary upload failed: ${uploadError}`);
      }

      const existingPrescription = await client.query(
        `SELECT prescription_id FROM prescriptions WHERE patient_id = $1`,
        [patient_id]
      );

      if (existingPrescription.rows.length > 0) {
        await client.query(
          `UPDATE prescriptions 
           SET prescription_file = $1, prescription_date = CURRENT_DATE 
           WHERE patient_id = $2`,
          [url, patient_id]
        );
      } else {
        const prescription_id = uuidv4();
        await client.query(
          `INSERT INTO prescriptions (prescription_id, patient_id, prescription_file) 
           VALUES ($1, $2, $3)`,
          [prescription_id, patient_id, url]
        );
      }
    }

    await client.query("COMMIT");

    // 5. Fetch updated patient with prescriptions
    const updatedPatientQuery = `
      SELECT 
        p.patient_id,
        p.full_name,
        p.gender,
        p.dob,
        p.relation,
        p.created_at,
        COALESCE(
          JSON_AGG(JSONB_BUILD_OBJECT(
            'prescription_id', pr.prescription_id,
            'prescription_file', pr.prescription_file,
            'prescription_date', pr.prescription_date,
            'created_at', pr.created_at
          )) FILTER (WHERE pr.prescription_id IS NOT NULL), '[]'
        ) AS prescriptions
      FROM patients p
      LEFT JOIN prescriptions pr ON p.patient_id = pr.patient_id
      WHERE p.patient_id = $1
      GROUP BY p.patient_id;
    `;

    const { rows } = await pool.query(updatedPatientQuery, [patient_id]);

    return sendSuccess(res, constants.OK, "Patient updated successfully", rows[0]);

  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("Edit Patient Error:", error.message);
    return sendServerError(res, error);
  } finally {
    client.release();
  }
});

export default {
    addAddress,
    addPatient,
    getAllPatients,
    getAllAddresses,
    addPrescription,
    editPatient
};
