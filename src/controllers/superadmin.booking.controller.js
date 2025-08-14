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
import { uploadToCloudinary } from "../utils/cloudnary.utils.js";


const allorderfromsuperadmin = expressAsyncHandler(async (req, res) => {
  try {
    const query = `
      SELECT 
          tb.booking_id,
          tb.booking_date,
          tb.scheduled_date,
          tb.status AS booking_status,
          tb.payment_status,
          tb.payment_mode,
          tb.transaction_id,
          u.first_name || ' ' || COALESCE(u.last_name, '') AS user_name,
          u.email AS user_email,
          p.full_name AS patient_name,
          p.gender AS patient_gender,
          p.relation AS patient_relation,
          a.address_line,
          a.city,
          a.state,
          a.pincode,
          -- Test aggregation without DISTINCT
          json_agg(
              json_build_object(
                  'item_id', tbi.item_id,
                  'test_name', tc.test_name,
                  'type_of_test', tc.type_of_test,
                  'test_price', tbi.test_price,
                  'report_link', tbi.report_link,
                  'test_status', tbi.status,
                  'medical_centre_name', mc.medicalcentre_name
              )
          ) AS tests,
          -- Prescription aggregation without DISTINCT
          COALESCE(
              json_agg(
                  json_build_object(
                      'prescription_id', pr.prescription_id,
                      'prescription_file', pr.prescription_file,
                      'prescription_date', pr.prescription_date
                  )
              ) FILTER (WHERE pr.prescription_id IS NOT NULL),
              '[]'
          ) AS prescriptions
      FROM test_bookings tb
      JOIN users u ON tb.user_id = u.user_id
      JOIN patients p ON tb.patient_id = p.patient_id
      LEFT JOIN addresses a ON tb.address_id = a.address_id
      JOIN test_booking_items tbi ON tb.booking_id = tbi.booking_id
      JOIN medical_test mt ON tbi.medical_test_id = mt.medical_test_id
      JOIN test_catalog tc ON mt.test_id = tc.test_id
      JOIN medical_centre mc ON mt.medicalcentre_id = mc.medicalcentre_id
      LEFT JOIN prescriptions pr ON pr.patient_id = p.patient_id
      GROUP BY 
          tb.booking_id, u.user_id, p.patient_id, a.address_id
      ORDER BY tb.created_at DESC;
    `;

    const { rows } = await pool.query(query);

    return sendSuccess(
      res,
      constants.OK,
      "All orders fetched successfully.",
      rows
    );
  } catch (error) {
    logger.error("Error all order from superadmin:", error.message);
    return sendServerError(res, error);
  }
});



const changeteststatusbysuperadmin = expressAsyncHandler(async (req, res) => {
    const client = await pool.connect();

    try {
        const { item_id, status } = req.body;
        const { booking_id } = req.params;
        const reportFile = req.file; // field: report_file

        // 1. Validation
        if (!item_id || !status || !booking_id) {
            return sendError(res, constants.VALIDATION_ERROR, "item_id, status, and booking_id are required.");
        }

        const allowedStatuses = [
            'sample collection due',
            'sample collected',
            'sample processing',
            'report generated',
            'report delivery',
            'Cancelled'
        ];
        if (!allowedStatuses.includes(status)) {
            return sendError(res, constants.VALIDATION_ERROR, "Invalid status value.");
        }

        await client.query("BEGIN");

        // 2. Check if test item exists
        const existingItem = await client.query(
            `SELECT 1 FROM test_booking_items WHERE item_id = $1 AND booking_id = $2`,
            [item_id, booking_id]
        );
        if (existingItem.rows.length === 0) {
            await client.query("ROLLBACK");
            return sendError(res, constants.NOT_FOUND, "Test item not found or does not belong to the booking.");
        }

        // 3. Build dynamic update
        const updateFields = ["status = $1"];
        const updateValues = [status];
        let idx = 2;
        let reportLink = null;

        // 4. Handle report upload
        if (reportFile) {
            const { success, url, error: uploadError } = await uploadToCloudinary(reportFile.path, "test_reports");
            if (!success) {
                await client.query("ROLLBACK");
                return sendError(res, constants.INTERNAL_SERVER_ERROR, `Cloudinary upload failed: ${uploadError}`);
            }
            reportLink = url;
            updateFields.push(`report_link = $${idx++}`);
            updateValues.push(reportLink);
        }

        updateValues.push(item_id, booking_id);

        await client.query(
            `UPDATE test_booking_items
             SET ${updateFields.join(", ")}
             WHERE item_id = $${idx++} AND booking_id = $${idx}`,
            updateValues
        );

        await client.query("COMMIT");

        // 5. Fetch updated record
        const updatedItemQuery = `
            SELECT 
                item_id,
                booking_id,
                medical_test_id,
                test_price,
                report_link,
                status,
                created_at
            FROM test_booking_items
            WHERE item_id = $1 AND booking_id = $2
        `;
        const { rows } = await pool.query(updatedItemQuery, [item_id, booking_id]);

        return sendSuccess(res, constants.OK, "Test status updated successfully", rows[0]);

    } catch (error) {
        await client.query("ROLLBACK");
        logger.error("Error changing test status by superadmin:", error.message);
        return sendServerError(res, error);
    } finally {
        client.release();
    }
});



export default{ allorderfromsuperadmin, changeteststatusbysuperadmin };