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

  const { test_name, type_of_test, components, special_requirements = null } = value;

  try {
    const test_id = uuidv4();

    const insertQuery = `
      INSERT INTO test_catalog (test_id, test_name, type_of_test, components, special_requirements)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const values = [
      test_id,
      test_name,
      type_of_test,
      JSON.stringify(components),
      special_requirements
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


const fetchTestCatalog = expressAsyncHandler(async (req, res) => {
  try {
    const { type_of_test, search, page = 1, limit = 10 } = req.query;

    let baseQuery = `SELECT * FROM test_catalog`;
    let countQuery = `SELECT COUNT(*) FROM test_catalog`;
    const queryParams = [];
    const countParams = [];
    const filters = [];

    // Filtering by type_of_test
    if (type_of_test) {
      queryParams.push(type_of_test);
      countParams.push(type_of_test);
      filters.push(`type_of_test = $${queryParams.length}`);
    }

    // Search by test_name (case-insensitive)
    if (search) {
      queryParams.push(`%${search.toLowerCase()}%`);
      countParams.push(`%${search.toLowerCase()}%`);
      filters.push(`LOWER(test_name) LIKE $${queryParams.length}`);
    }

    // Apply filters
    if (filters.length > 0) {
      baseQuery += ` WHERE ${filters.join(" AND ")}`;
      countQuery += ` WHERE ${filters.join(" AND ")}`;
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    queryParams.push(limit, offset);
    baseQuery += ` ORDER BY test_name ASC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length};`;

    // Queries
    const [countResult, dataResult, typesResult] = await Promise.all([
      pool.query(countQuery, countParams),
      pool.query(baseQuery, queryParams),
      pool.query(`SELECT DISTINCT type_of_test FROM test_catalog`)
    ]);

    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    const allTypes = typesResult.rows.map(row => row.type_of_test);

    return sendSuccess(
      res,
      constants.OK,
      "Test catalog fetched successfully",
      {
        data: dataResult.rows,
        pagination: {
          totalItems,
          totalPages,
          currentPage: parseInt(page),
          limit: parseInt(limit),
        },
        type_of_test_list: allTypes
      }
    );
  } catch (error) {
    logger.info("Error fetching test catalog:", error.message);
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
    const offset = (page - 1) * limit;

    const filters = [`mt.medicalcentre_id = $1`];
    const params = [medicalcentre_id];
    let index = 2;

    if (type_of_test) {
      filters.push(`tc.type_of_test = $${index}`);
      params.push(type_of_test);
      index++;
    }

    if (search) {
      filters.push(`LOWER(tc.test_name) LIKE $${index}`);
      params.push(`%${search.toLowerCase()}%`);
      index++;
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Single query using CTEs for count, paginated data, and distinct types
    const fullQuery = `
      WITH filtered_tests AS (
        SELECT 
          mt.medical_test_id,
          tc.test_id,
          tc.test_name,
          tc.type_of_test,
          tc.components,
          tc.special_requirements,
          mt.price,
          mt.created_at
        FROM medical_test AS mt
        JOIN test_catalog AS tc ON mt.test_id = tc.test_id
        ${whereClause}
      ),
      total_count AS (
        SELECT COUNT(*) AS count FROM filtered_tests
      ),
      paginated_tests AS (
        SELECT * FROM filtered_tests
        ORDER BY created_at DESC
        LIMIT $${index} OFFSET $${index + 1}
      ),
      type_list AS (
        SELECT DISTINCT type_of_test FROM filtered_tests
      )
      SELECT 
        (SELECT json_agg(paginated_tests) FROM paginated_tests) AS tests,
        (SELECT count FROM total_count),
        (SELECT json_agg(type_of_test) FROM type_list) AS type_of_tests;
    `;

    params.push(limit, offset);

    const { rows } = await pool.query(fullQuery, params);

    const data = rows[0];

    const totalItems = parseInt(data.count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    return sendSuccess(res, constants.OK, "Tests fetched successfully.", {
      totalItems,
      totalPages,
      currentPage: page,
      tests: data.tests || [],
      type_of_tests: data.type_of_tests || []
    });

  } catch (error) {
    logger.info(error.message);
    return sendServerError(res, error);
  }
});

const deleteTestFromMedicalCentre = expressAsyncHandler(async (req, res) => {
  const { test_id, medicalcentre_id } = req.params;

  if (!test_id || !medicalcentre_id) {
    return sendError(res, constants.VALIDATION_ERROR, "Test ID and Medical Centre ID are required.");
  }

  try {
    const deleteQuery = `
      DELETE FROM medical_test
      WHERE test_id = $1 AND medicalcentre_id = $2
      RETURNING *;
    `;

    const { rowCount, rows } = await pool.query(deleteQuery, [test_id, medicalcentre_id]);

    if (rowCount === 0) {
      return sendError(res, constants.NOT_FOUND, "Test not found in this medical centre.");
    }

    return sendSuccess(
      res,
      constants.OK,
      "Test removed from medical centre successfully.",
      rows[0]
    );

  } catch (error) {
    logger.info("Error deleting test from medical centre:", error.message);
    return sendServerError(res, error);
  }
});

export default {
  addTestCatalog,
  addTestToMedicalCentre,
  getTestsForMedicalCentre,
  fetchTestCatalog,
  deleteTestFromMedicalCentre
};
