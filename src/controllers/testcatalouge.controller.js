import expressAsyncHandler from "express-async-handler";
import {
  sendError,
  sendServerError,
  sendSuccess,
} from "../utils/response.utils.js";
import logger from "../utils/logger.utils.js";
import constants from "../config/constants.config.js";
import pool from "../config/db.config.js";


const patchTestCatalog = expressAsyncHandler(async (req, res) => {
  const { test_id } = req.params;
  const { test_name, type_of_test, components, special_requirements } = req.body;

  if (!test_id) {
    return sendError(res, constants.VALIDATION_ERROR, "Test ID is required.");
  }

  if (!test_name && !type_of_test && !components && special_requirements === undefined) {
    return sendError(res, constants.VALIDATION_ERROR, "At least one field must be provided to update.");
  }

  const fields = [];
  const values = [];
  let index = 1;

  if (test_name) {
    fields.push(`test_name = $${index++}`);
    values.push(test_name);
  }
  if (type_of_test) {
    fields.push(`type_of_test = $${index++}`);
    values.push(type_of_test);
  }
  if (components) {
    fields.push(`components = $${index++}`);
    values.push(JSON.stringify(components));
  }
  if (special_requirements !== undefined) {
    fields.push(`special_requirements = $${index++}`);
    values.push(special_requirements); // Can be null or string
  }

  values.push(test_id);

  const updateQuery = `
    UPDATE test_catalog
    SET ${fields.join(", ")}
    WHERE test_id = $${index}
    RETURNING *;
  `;

  try {
    const result = await pool.query(updateQuery, values);

    if (result.rowCount === 0) {
      return sendError(res, constants.NOT_FOUND, "Test catalog not found.");
    }

    return sendSuccess(
      res,
      constants.OK,
      "Test catalog updated successfully.",
      result.rows[0]
    );
  } catch (error) {
    logger.info("Error patching test catalog:", error.message);
    return sendServerError(res, error);
  }
});


const deleteTestCatalog = expressAsyncHandler(async (req, res) => {
  const { test_id } = req.params;

  if (!test_id) {
    return sendError(res, constants.VALIDATION_ERROR, "Test ID is required.");
  }

  try {
    const deleteQuery = `DELETE FROM test_catalog WHERE test_id = $1 RETURNING *;`;
    const result = await pool.query(deleteQuery, [test_id]);

    if (result.rowCount === 0) {
      return sendError(res, constants.NOT_FOUND, "Test catalog not found.");
    }

    return sendSuccess(
      res,
      constants.OK,
      "Test catalog deleted successfully.",
      result.rows[0] // Return the deleted record for confirmation
    );
  } catch (error) {
    logger.info("Error deleting test catalog:", error.message);
    return sendServerError(res, error);
  }
});

export default {patchTestCatalog,deleteTestCatalog};