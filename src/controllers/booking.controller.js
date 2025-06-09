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

const createBooking = expressAsyncHandler(async (req, res) => {
    const client = await pool.connect();
    try {
        const user_id = req.user?.user_id;
        const {
            patient_id,
            address_id,
            scheduled_date,
            payment_mode,
            transaction_id,
            tests // array of { medical_test_id }
        } = req.body;

        if (!tests || !Array.isArray(tests) || tests.length === 0) {
            return sendError(res, constants.VALIDATION_ERROR, "Please provide a valid array of tests.");
        }

        const medicalTestIds = tests.map(test => test.medical_test_id);

        // Fetch all prices in a single query
        const priceResult = await client.query(
            `SELECT medical_test_id, price FROM medical_test WHERE medical_test_id = ANY($1)`,
            [medicalTestIds]
        );

        const priceMap = new Map(priceResult.rows.map(row => [row.medical_test_id, row.price]));

        // Ensure all tests exist
        const missingTests = medicalTestIds.filter(id => !priceMap.has(id));
        if (missingTests.length > 0) {
            return sendError(res, constants.NOT_FOUND, `Invalid test IDs: ${missingTests.join(", ")}`);
        }

        await client.query('BEGIN');
        const booking_id = uuidv4();

        // Insert booking
        await client.query(`
            INSERT INTO test_bookings (
                booking_id, user_id, patient_id, address_id,
                scheduled_date, payment_mode, transaction_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            booking_id, user_id, patient_id, address_id,
            scheduled_date, payment_mode, transaction_id
        ]);

        // Prepare bulk insert for test_booking_items
        const insertValues = [];
        const insertParams = [];
        let paramIndex = 1;

        for (const test of tests) {
            const item_id = uuidv4();
            const test_price = priceMap.get(test.medical_test_id);
            insertValues.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
            insertParams.push(item_id, booking_id, test.medical_test_id, test_price);
        }

        const insertQuery = `
            INSERT INTO test_booking_items (
                item_id, booking_id, medical_test_id, test_price
            ) VALUES ${insertValues.join(", ")}
        `;

        await client.query(insertQuery, insertParams);

        await client.query('COMMIT');

        return sendSuccess(res, constants.CREATED, "Booking created successfully", { booking_id });
    } catch (error) {
        logger.error("Error creating booking:", error.message);
        await client.query("ROLLBACK");
        return sendServerError(res, error);
    } finally {
        client.release();
    }
});

const getTestSummary = expressAsyncHandler(async (req, res) => {
  const { tests } = req.body;

  if (!tests || !Array.isArray(tests) || tests.length === 0) {
    return sendError(res, constants.VALIDATION_ERROR, "Tests array is required");
  }

  const ids = tests.map((t) => t.medical_test_id);

  try {
    const result = await pool.query(
      `
      SELECT 
        mt.medical_test_id,
        mt.price,
        tc.test_name,
        tc.type_of_test,
        tc.components,
        tc.special_requirements,
        mc.medicalcentre_id,
        mc.medicalcentre_name,
        mc.address_line,
        mc.area,
        mc.district,
        mc.state,
        mc.pincode
      FROM medical_test mt
      JOIN test_catalog tc ON mt.test_id = tc.test_id
      JOIN medical_centre mc ON mt.medicalcentre_id = mc.medicalcentre_id
      WHERE mt.medical_test_id = ANY($1)
      `,
      [ids]
    );

    // Group by medical centre
    const grouped = {};
    let totalPrice = 0;

    result.rows.forEach((row) => {
      totalPrice += Number(row.price);
      if (!grouped[row.medicalcentre_id]) {
        grouped[row.medicalcentre_id] = {
          medicalcentre_id: row.medicalcentre_id,
          medicalcentre_name: row.medicalcentre_name,
          address: {
            address_line: row.address_line,
            area: row.area,
            district: row.district,
            state: row.state,
            pincode: row.pincode
          },
          tests: []
        };
      }

      grouped[row.medicalcentre_id].tests.push({
        medical_test_id: row.medical_test_id,
        test_name: row.test_name,
        type_of_test: row.type_of_test,
        components: row.components,
        special_requirements: row.special_requirements,
        price: Number(row.price)
      });
    });

    return sendSuccess(res, constants.OK, "Test summary fetched successfully", {
      total_price: totalPrice,
      centre_count: Object.keys(grouped).length,
      centres: Object.values(grouped)
    });

  } catch (error) {
    console.error(error.message);
    return sendServerError(res, error);
  }
});

export default {
    createBooking,
    getTestSummary
}