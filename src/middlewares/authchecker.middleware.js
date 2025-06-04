import jwt from 'jsonwebtoken';
import { sendUnauthorized } from '../utils/response.utils.js';
import pool from '../config/db.config.js';
import variable from '../config/env.config.js';
import expressAsyncHandler from 'express-async-handler';

export const userChecker = expressAsyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return sendUnauthorized(res);

    const decodedToken = jwt.verify(token, variable.jwt_secret);
    // console.log(decodedToken);
    
    const query = 'SELECT user_id, email FROM users WHERE user_id = $1';
    const { rows } = await pool.query(query, [decodedToken.user_id]);
    // console.log({rows});
    

    if (rows.length === 0) return sendUnauthorized(res);

    req.user = rows[0]; // Attach superadmin info to request
    // console.log(req.user);
    
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return sendUnauthorized(res);
  }
});

export const superadminChecker = expressAsyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) return sendUnauthorized(res);

    const decodedToken = jwt.verify(token, variable.jwt_secret);
    // console.log(decodedToken);
    
    const query = 'SELECT superadmin_id, email FROM superadmin WHERE superadmin_id = $1';
    const { rows } = await pool.query(query, [decodedToken.superadmin_id]);
    // console.log({rows});
    

    if (rows.length === 0) return sendUnauthorized(res);

    req.user = rows[0]; // Attach superadmin info to request
    // console.log(req.user);
    
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return sendUnauthorized(res);
  }
});

