// backend/server.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path"); // Import path module

const taskRoutes = require("./routes/tasks");
const userRoutes = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Define the UPLOAD_DIR again for static serving, ensuring it's the same path
// It should point to `streamline-mvp/uploads`
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Serve static files from the 'uploads' directory
// This makes files accessible via URLs like http://localhost:5000/uploads/userId/filename.jpg
app.use("/uploads", express.static(UPLOAD_DIR));

// Routes
app.use("/api", taskRoutes);
app.use("/api", userRoutes);

// Basic test route
app.get("/", (req, res) => {
  res.send("Streamline Backend API is running!");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
