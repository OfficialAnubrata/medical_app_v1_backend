import expressAsyncHandler from "express-async-handler";
import {
  medicalTestSchema,
  testCatalogSchema,
} from "../validators/testCatalog.Validators.js";
import {
  sendError,
  sendServerError,
  sendSuccess,
} from "../utils/response.utils.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.utils.js";
import constants from "../config/constants.config.js";
import pool from "../config/db.config.js";

const addTestCatalog = expressAsyncHandler(async (req, res) => {
  const { error, value } = testCatalogSchema.validate(req.body);
  if (error) {
    return sendError(res, constants.VALIDATION_ERROR, error.details[0].message);
  }

  const { test_name, type_of_test, components } = value;
  try {
    const test_id = uuidv4();

    const insertQuery = `
        INSERT INTO test_catalog (test_id, test_name, type_of_test, components)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
    const values = [
      test_id,
      test_name,
      type_of_test,
      JSON.stringify(components),
    ];
    const result = await pool.query(insertQuery, values);
    if (result.rowCount === 0) {
      return sendError(res, constants.NOT_FOUND, "Test catalog not found");
    }
    return sendSuccess(
      res,
      constants.CREATED,
      "Test catalog added successfully",
      result.rows[0]
    );
  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const addTestToMedicalCentre = expressAsyncHandler(async (req, res) => {
  const { error, value } = medicalTestSchema.validate(req.body);
  if (error) {
    return sendError(res, constants.VALIDATION_ERROR, error.details[0].message);
  }
  const { test_id, medicalcentre_id, price } = value;

  const result = await pool.query(
    `    
    SELECT 
      (SELECT COUNT(*) FROM test_catalog WHERE test_id = $1) AS test_exists,
      (SELECT COUNT(*) FROM medical_centre WHERE medicalcentre_id = $2) AS centre_exists,
      (SELECT COUNT(*) FROM medical_test WHERE test_id = $1 AND medicalcentre_id = $2) AS already_added
    `,
    [test_id, medicalcentre_id]
  );

  const { test_exists, centre_exists, already_added } = result.rows[0];

  if (test_exists === 0) {
    return sendError(res, constants.NOT_FOUND, "Test not found");
  }
  if (centre_exists === 0) {
    return sendError(res, constants.NOT_FOUND, "Medical centre not found");
  }
  if (already_added > 0) {
    return sendError(
      res,
      constants.CONFLICT,
      "Test already added to this medical centre"
    );
  }
  const medical_test_id = uuidv4();
  const insertQuery = `
        INSERT INTO medical_test (medical_test_id, test_id, medicalcentre_id, price)
     VALUES ($1, $2, $3, $4)
        RETURNING *;
      `;
  const values = [medical_test_id,test_id, medicalcentre_id, price];
  const result_TEST = await pool.query(insertQuery, values);
  if (result_TEST.rowCount === 0) {
    return sendError(res, constants.NOT_FOUND, "Test not found");
  }
  return sendSuccess(
    res,
    constants.CREATED,
    "Test added to medical centre successfully",
    result_TEST.rows[0]
  );
});

const getTestsForMedicalCentre = expressAsyncHandler(async (req, res) => {
  const { medicalcentre_id } = req.params;
  let { page = 1, limit = 10, type_of_test, search } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  if (!medicalcentre_id) {
    return sendError(res, constants.VALIDATION_ERROR, "Medical centre ID is required.");
  }
  if (page < 1 || limit < 1) {
    return sendError(res, constants.VALIDATION_ERROR, "Page and limit must be positive integers.");
  }

  try {
    let baseQuery = `
      FROM medical_test AS mt
      INNER JOIN test_catalog AS tc ON mt.test_id = tc.test_id
      WHERE mt.medicalcentre_id = $1
    `;

    const params = [medicalcentre_id];
    let paramIndex = 2;

    if (type_of_test) {
      baseQuery += ` AND tc.type_of_test = $${paramIndex}`;
      params.push(type_of_test);
      paramIndex++;
    }

    if (search) {
      baseQuery += ` AND LOWER(tc.test_name) LIKE $${paramIndex}`;
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    // Get total count for pagination
    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);
    const offset = (page - 1) * limit;

    // Fetch paginated results
    const dataQuery = `
      SELECT 
        mt.medical_test_id,
        tc.test_id,
        tc.test_name,
        tc.type_of_test,
        tc.components,
        mt.price,
        mt.created_at
      ${baseQuery}
      ORDER BY mt.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const { rows } = await pool.query(dataQuery, params);

    return sendSuccess(res, constants.OK, "Tests fetched successfully.", {
      totalItems,
      totalPages,
      currentPage: page,
      tests: rows,
    });

  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

export default {
  addTestCatalog,
  addTestToMedicalCentre,
  getTestsForMedicalCentre
};
