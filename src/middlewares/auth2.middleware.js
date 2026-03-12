const jwt = require("jsonwebtoken");

exports.verifyRefreshToken = (req, res, next) => {
  try {
    // 1. Get header
    const authHeader = req.headers.authorization;

    // 2. Check header exists
    if (!authHeader) {
      return res.status(401).json({
        status: false,
        message: "Access denied. Token missing",
      });
    }

    // 3. Split Bearer token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Invalid token format",
      });
    }

    // 4. Verify token
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // 5. Attach user data
    req.user = decoded;

    next(); // allow API

  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
    });
  }
};