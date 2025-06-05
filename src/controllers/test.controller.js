import expressAsyncHandler from "express-async-handler";
import { testCatalogSchema } from "../validators/testCatalog.Validators.js";
import { sendError, sendServerError, sendSuccess } from "../utils/response.utils.js";
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
    const values = [test_id, test_name, type_of_test, JSON.stringify(components)];
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

export default {
  addTestCatalog,
};
