const jwt = require('jsonwebtoken');
require('dotenv').config();
const secretKey = process.env.JWT_SECRET;
const refreshSecretKey = process.env.REFRESH_TOKEN_SECRET;

// Function to generate a JWT token
const generateToken = (payload, expiresIn = '1h') => {
  return jwt.sign(payload, secretKey, { expiresIn });
};


const generateRefreshToken = (payload) => {
  const token = jwt.sign(payload, refreshSecretKey, { expiresIn: '1y' });
  return token;
}

module.exports = {
  generateToken,
  generateRefreshToken
};