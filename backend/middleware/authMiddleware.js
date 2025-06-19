// backend/middleware/authMiddleware.js
const { auth } = require("../config/firebaseAdmin");

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied" });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken; // Add user info to request
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(403).json({ message: "Token is not valid" });
  }
};

const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };
