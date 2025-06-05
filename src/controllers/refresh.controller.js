import jwt from 'jsonwebtoken';
import expressAsyncHandler from 'express-async-handler';
import variable from '../config/env.config.js';

export const refreshAccessToken = expressAsyncHandler(async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    // Verify refresh token
    jwt.verify(token, variable.refresh_token, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
      }

      const user_id = decoded.user_id;

      // Generate new access token
      const newAccessToken = jwt.sign(
        { user_id },
        variable.jwt_secret,
        { expiresIn: '1D' }
      );

      return res.status(200).json({
        accessToken: newAccessToken,
        message: 'New access token generated successfully',
      });
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});
