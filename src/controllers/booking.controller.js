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
import { getRoadDistance } from "../utils/road.distance.utils.js";

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
       logger.error("Error creating booking:", error.message);
    return sendServerError(res, error);
  }
});

const allordersuser = expressAsyncHandler(async (req, res) => {
  try {
    // Fix: Correct destructuring - userID is the property, user_id is the field
    const userID = req.user.user_id; // or const { user_id: userID } = req.user;
    const { status } = req.query;

    // Validate userID
    if (!userID) {
      return sendServerError(res, new Error('User ID is required'));
    }

    // Build the query with optional status filter
    let query = `
      SELECT 
        tb.booking_id,
        tb.user_id,
        tb.patient_id,
        tb.address_id,
        tb.booking_date,
        tb.scheduled_date,
        tb.status,
        tb.payment_status,
        tb.payment_mode,
        tb.transaction_id,
        tb.created_at,
        
        -- Patient details
        p.full_name as patient_name,
        p.gender as patient_gender,
        p.dob as patient_dob,
        p.relation as patient_relation,
        
        -- Address details (for home collection)
        a.label as address_label,
        a.address_line,
        a.area,
        a.city,
        a.district,
        a.state,
        a.pincode,
        a.landmark,
        a.contact_number,
        
        -- Aggregated booking items
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', tbi.item_id,
              'medical_test_id', tbi.medical_test_id,
              'test_price', tbi.test_price,
              'report_link', tbi.report_link,
              'item_status', tbi.status,
              'test_name', tc.test_name,
              'test_type', tc.type_of_test,
              'components', tc.components,
              'special_requirements', tc.special_requirements,
              'medical_centre_name', mc.medicalcentre_name
            ) ORDER BY tbi.created_at
          ) FILTER (WHERE tbi.item_id IS NOT NULL), 
          '[]'::json
        ) as booking_items,
        
        -- Total amount
        COALESCE(SUM(tbi.test_price), 0) as total_amount,
        COUNT(tbi.item_id) as total_tests
        
      FROM test_bookings tb
      LEFT JOIN patients p ON tb.patient_id = p.patient_id
      LEFT JOIN addresses a ON tb.address_id = a.address_id
      LEFT JOIN test_booking_items tbi ON tb.booking_id = tbi.booking_id
      LEFT JOIN medical_test mt ON tbi.medical_test_id = mt.medical_test_id
      LEFT JOIN test_catalog tc ON mt.test_id = tc.test_id
      LEFT JOIN medical_centre mc ON mt.medicalcentre_id = mc.medicalcentre_id
      
      WHERE tb.user_id = $1
    `;

    const queryParams = [userID];
    let paramIndex = 2;

    // Add status filter if provided
    if (status) {
      query += ` AND tb.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Add GROUP BY and ORDER BY
    query += `
      GROUP BY 
        tb.booking_id, tb.user_id, tb.patient_id, tb.address_id,
        tb.booking_date, tb.scheduled_date, tb.status, tb.payment_status,
        tb.payment_mode, tb.transaction_id, tb.created_at,
        p.full_name, p.gender, p.dob, p.relation,
        a.label, a.address_line, a.area, a.city, a.district, 
        a.state, a.pincode, a.landmark, a.contact_number
      ORDER BY tb.created_at DESC
    `;

    // Execute the query
    const result = await pool.query(query, queryParams);

    // Format the response
    const orders = result.rows.map(row => ({
      booking_id: row.booking_id,
      user_id: row.user_id,
      booking_date: row.booking_date,
      scheduled_date: row.scheduled_date,
      status: row.status,
      payment_status: row.payment_status,
      payment_mode: row.payment_mode,
      transaction_id: row.transaction_id,
      total_amount: parseFloat(row.total_amount),
      total_tests: parseInt(row.total_tests),
      created_at: row.created_at,
      
      patient: {
        patient_id: row.patient_id,
        name: row.patient_name,
        gender: row.patient_gender,
        dob: row.patient_dob,
        relation: row.patient_relation
      },
      
      address: row.address_id ? {
        address_id: row.address_id,
        label: row.address_label,
        address_line: row.address_line,
        area: row.area,
        city: row.city,
        district: row.district,
        state: row.state,
        pincode: row.pincode,
        landmark: row.landmark,
        contact_number: row.contact_number
      } : null,
      
      tests: row.booking_items || []
    }));

    return sendSuccess(res, constants.OK, "Bookings fetched successfully", { orders });
  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const getBookingById = expressAsyncHandler(async (req, res) => {
  try {
    const bookingID = req.params.booking_id;

    if (!bookingID) {
      return sendServerError(res, new Error("Booking ID is required"));
    }

    const query = `
      SELECT 
        tb.booking_id,
        tb.user_id,
        tb.patient_id,
        tb.address_id,
        tb.booking_date,
        tb.scheduled_date,
        tb.status,
        tb.payment_status,
        tb.payment_mode,
        tb.transaction_id,
        tb.created_at,

        -- Patient details
        p.full_name as patient_name,
        p.gender as patient_gender,
        p.dob as patient_dob,
        p.relation as patient_relation,

        -- Address details (if available)
        a.label as address_label,
        a.address_line,
        a.area,
        a.city,
        a.district,
        a.state,
        a.pincode,
        a.landmark,
        a.contact_number,

        -- Aggregated booking items
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'item_id', tbi.item_id,
              'medical_test_id', tbi.medical_test_id,
              'test_price', tbi.test_price,
              'report_link', tbi.report_link,
              'item_status', tbi.status,
              'test_name', tc.test_name,
              'test_type', tc.type_of_test,
              'components', tc.components,
              'special_requirements', tc.special_requirements,
              'medical_centre_name', mc.medicalcentre_name
            ) ORDER BY tbi.created_at
          ) FILTER (WHERE tbi.item_id IS NOT NULL),
          '[]'::json
        ) as booking_items,

        -- Total amount
        COALESCE(SUM(tbi.test_price), 0) as total_amount,
        COUNT(tbi.item_id) as total_tests

      FROM test_bookings tb
      LEFT JOIN patients p ON tb.patient_id = p.patient_id
      LEFT JOIN addresses a ON tb.address_id = a.address_id
      LEFT JOIN test_booking_items tbi ON tb.booking_id = tbi.booking_id
      LEFT JOIN medical_test mt ON tbi.medical_test_id = mt.medical_test_id
      LEFT JOIN test_catalog tc ON mt.test_id = tc.test_id
      LEFT JOIN medical_centre mc ON mt.medicalcentre_id = mc.medicalcentre_id

      WHERE tb.booking_id = $1

      GROUP BY 
        tb.booking_id, tb.user_id, tb.patient_id, tb.address_id,
        tb.booking_date, tb.scheduled_date, tb.status, tb.payment_status,
        tb.payment_mode, tb.transaction_id, tb.created_at,
        p.full_name, p.gender, p.dob, p.relation,
        a.label, a.address_line, a.area, a.city, a.district, 
        a.state, a.pincode, a.landmark, a.contact_number
    `;

    const result = await pool.query(query, [bookingID]);

    if (result.rows.length === 0) {
      return sendServerError(res, new Error("Booking not found"));
    }

    const row = result.rows[0];

    const booking = {
      booking_id: row.booking_id,
      user_id: row.user_id,
      booking_date: row.booking_date,
      scheduled_date: row.scheduled_date,
      status: row.status,
      payment_status: row.payment_status,
      payment_mode: row.payment_mode,
      transaction_id: row.transaction_id,
      total_amount: parseFloat(row.total_amount),
      total_tests: parseInt(row.total_tests),
      created_at: row.created_at,

      patient: {
        patient_id: row.patient_id,
        name: row.patient_name,
        gender: row.patient_gender,
        dob: row.patient_dob,
        relation: row.patient_relation
      },

      address: row.address_id ? {
        address_id: row.address_id,
        label: row.address_label,
        address_line: row.address_line,
        area: row.area,
        city: row.city,
        district: row.district,
        state: row.state,
        pincode: row.pincode,
        landmark: row.landmark,
        contact_number: row.contact_number
      } : null,

      tests: row.booking_items || []
    };

    return sendSuccess(res, constants.OK, "Booking fetched successfully", { booking });
  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const distancebetweenpoints = expressAsyncHandler(async (req, res) => {
  try {
    const { lon1, lat1, lon2, lat2 } = req.body;

    if ([lon1, lat1, lon2, lat2].some(coord => coord === undefined)) {
      return sendError(res, constants.VALIDATION_ERROR, "All coordinates are required.");
    }

    const origin = [parseFloat(lon1), parseFloat(lat1)];
    const destination = [parseFloat(lon2), parseFloat(lat2)];

    const result = await getRoadDistance(origin, destination);

    if (!result) {
      return sendError(res, constants.INTERNAL_SERVER_ERROR, "Failed to calculate distance.");
    }

    return sendSuccess(res, constants.OK, "Distance calculated successfully.", result);
  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

export default {
    createBooking,
    getTestSummary,
    allordersuser,
    getBookingById,
    distancebetweenpoints
}