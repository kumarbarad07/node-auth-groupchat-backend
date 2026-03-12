// const jwt = require("jsonwebtoken");

// exports.verifyToken = (req, res, next) => {
//   try {
//     // 1. Get header
//     const authHeader = req.headers.authorization;

//     // 2. Check header exists
//     if (!authHeader) {
//       return res.status(401).json({
//         status: false,
//         message: "Access denied. Token missing",
//       });
//     }

//     // 3. Split Bearer token
//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({
//         status: false,
//         message: "Invalid token format",
//       });
//     }

//     // 4. Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // 5. Attach user data
//     req.user = decoded;

//     next(); // allow API

//   } catch (error) {
//     return res.status(401).json({
//       status: false,
//       message: "Invalid or expired token",
//     });
//   }
// };

// exports.verifyAnyToken = (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1]
//       || req.body.refreshToken;

//     if (!token) {
//       return res.status(401).json({
//         message: "Token missing"
//       });
//     }

//     let decoded;

//     try {
//       decoded = jwt.verify(
//         token,
//         process.env.JWT_SECRET
//       );
//       req.tokenType = "access";
//     } catch {
//       decoded = jwt.verify(
//         token,
//         process.env.REFRESH_TOKEN_SECRET
//       );
//       req.tokenType = "refresh";
//     }

//     req.user = decoded;
//     next();

//   } catch {
//     return res.status(401).json({
//       message: "Invalid token",
//     });
//   }
// };

const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.verifyAnyToken = (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.split(" ")[1] ||
      req.body.refreshToken;

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Token missing",
      });
    }

    let decoded;
    let tokenType;

    // Try access token
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      tokenType = "access";
    } catch (err) {
      // Try refresh token
      decoded = jwt.verify(
        token,
        process.env.REFRESH_TOKEN_SECRET
      );
      tokenType = "refresh";
    }

    // Attach decoded user
    req.user = decoded;
    req.tokenType = tokenType;

    next();

  } catch (error) {
    return res.status(401).json({
      status: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
};
