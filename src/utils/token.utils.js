import pkg from 'jsonwebtoken';
const { sign } = pkg;
import variable from "../config/env.config.js";

/**
 * Generates a JWT auth token
 * @param {Object} payload - Data to encode in the JWT
 * @returns {string} - Signed JWT token
 */
export async function generateAuthToken(payload) {
  return sign(payload, variable.jwt_secret, {
    expiresIn: variable.expery_time,
  });
}
