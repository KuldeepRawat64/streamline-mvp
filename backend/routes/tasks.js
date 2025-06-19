// backend/routes/tasks.js
const express = require("express");
const { db } = require("../config/firebaseAdmin");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

// NEW IMPORTS FOR FILE UPLOAD
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // Node.js File System module

const router = express.Router();

// --- File Upload Configuration (Multer) ---
// Define the directory where uploaded files will be stored.
// It's crucial this path is accessible by your Express server.
// `path.join(__dirname, '..', '..', 'uploads')` points to `streamline-mvp/uploads`
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

// Ensure the upload directory exists
// This check runs when the server starts and this file is loaded.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log(`Created upload directory: ${UPLOAD_DIR}`);
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Dynamically create subfolders based on user ID for better organization
    // req.user.uid is set by `authenticateToken` middleware
    const userUploadsDir = path.join(UPLOAD_DIR, req.user.uid);
    if (!fs.existsSync(userUploadsDir)) {
      fs.mkdirSync(userUploadsDir, { recursive: true });
    }
    cb(null, userUploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename to prevent collisions and maintain original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Initialize Multer upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB file size
  fileFilter: (req, file, cb) => {
    // Accept only image file types for this specific proofType
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// --- Existing Routes (No change unless specified) ---

// Create a task (Manager only)
router.post(
  "/tasks",
  authenticateToken,
  authorizeRole(["manager"]),
  async (req, res) => {
    const { title, description, assignedTo, deadline, proofType } = req.body;
    if (!title || !assignedTo || !deadline) {
      return res.status(400).json({ message: "Missing required task fields." });
    }
    try {
      const newTask = {
        title,
        description: description || "",
        assignedTo, // UID of the team member
        assignedBy: req.user.uid, // UID of the manager
        status: "pending", // pending, submitted, approved, rejected
        // Store deadline as a Firestore Timestamp or Date object
        deadline: new Date(deadline),
        proofType: proofType || "image", // default proof type
        createdAt: new Date(),
        lastUpdated: new Date(),
      };
      const docRef = await db.collection("tasks").add(newTask);
      res.status(201).json({ id: docRef.id, ...newTask });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task." });
    }
  }
);

// Get tasks for a specific user (Team Member or Manager for their assigned tasks)
router.get("/tasks/assigned-to-me", authenticateToken, async (req, res) => {
  try {
    const tasksRef = db.collection("tasks");
    // Ensure you're querying for tasks assigned to the *authenticated* user's UID
    const snapshot = await tasksRef
      .where("assignedTo", "==", req.user.uid)
      .get();
    const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(tasks);
  } catch (error) {
    console.error("Error fetching tasks for user:", error);
    res.status(500).json({ message: "Failed to retrieve tasks." });
  }
});

// Get tasks for a specific manager (tasks assigned by them)
router.get(
  "/tasks/assigned-by-me",
  authenticateToken,
  authorizeRole(["manager"]),
  async (req, res) => {
    try {
      const tasksRef = db.collection("tasks");
      const snapshot = await tasksRef
        .where("assignedBy", "==", req.user.uid)
        .get();
      const tasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      res.status(200).json(tasks);
    } catch (error) {
      console.error("Error fetching tasks assigned by manager:", error);
      res.status(500).json({ message: "Failed to retrieve tasks." });
    }
  }
);

// --- MODIFIED ROUTE: Submit task proof (Team Member) ---
router.post(
  // Changed to POST as it's typically for creating a new submission record
  "/tasks/:id/submit-proof",
  authenticateToken,
  authorizeRole(["team_member"]),
  upload.single("proofImage"), // Multer middleware to handle the file upload
  async (req, res) => {
    const { id } = req.params;
    const { submissionNotes } = req.body; // submissionNotes will be in req.body

    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded or file type is not supported." });
    }

    try {
      const taskRef = db.collection("tasks").doc(id);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        // Clean up the uploaded file if task not found
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting uploaded file:", err);
        });
        return res.status(404).json({ message: "Task not found." });
      }

      if (taskDoc.data().assignedTo !== req.user.uid) {
        fs.unlink(req.file.path, (err) => {
          // Clean up
          if (err) console.error("Error deleting uploaded file:", err);
        });
        return res.status(403).json({
          message: "You are not authorized to submit proof for this task.",
        });
      }
      if (taskDoc.data().status !== "pending") {
        fs.unlink(req.file.path, (err) => {
          // Clean up
          if (err) console.error("Error deleting uploaded file:", err);
        });
        return res.status(400).json({
          message: "Task is not in pending status for submission.",
        });
      }

      // Construct the URL to access the uploaded file from the frontend
      // This assumes your Express server serves static files from the 'uploads' directory
      // at the '/uploads' URL prefix (configured in server.js).
      // Example: /uploads/userId/filename.jpg
      const relativeFilePath = path.join(req.user.uid, req.file.filename);
      const imageUrl = `/uploads/${relativeFilePath.replace(/\\/g, "/")}`; // Ensure URL uses forward slashes

      await taskRef.update({
        status: "submitted",
        submissionProofUrl: imageUrl, // Store the URL generated from your server
        submissionNotes: submissionNotes || "",
        submittedAt: new Date(),
        lastUpdated: new Date(),
      });

      res.status(200).json({
        message: "Proof submitted successfully!",
        imageUrl: imageUrl, // Send the URL back to the frontend
      });
    } catch (error) {
      console.error("Error submitting proof:", error);
      // If a Multer error occurs (e.g., file size limit), it will be in `error` object
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ message: "File too large. Max 5MB allowed." });
        }
      }
      // Clean up the file if an error occurred after it was saved by multer but before DB update
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlink(req.file.path, (err) => {
          if (err)
            console.error("Error deleting file after failed DB update:", err);
        });
      }
      res
        .status(500)
        .json({ message: "Failed to submit proof. " + error.message });
    }
  }
);

// Approve/Reject Task (Manager)
router.put(
  "/tasks/:id/review",
  authenticateToken,
  authorizeRole(["manager"]),
  async (req, res) => {
    const { id } = req.params;
    const { status, managerFeedback } = req.body; // status: 'approved' or 'rejected'

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status for review." });
    }

    try {
      const taskRef = db.collection("tasks").doc(id);
      const taskDoc = await taskRef.get();

      if (!taskDoc.exists) {
        return res.status(404).json({ message: "Task not found." });
      }

      // Ensure the manager reviewing is the one who assigned the task (or has general review rights)
      if (taskDoc.data().assignedBy !== req.user.uid) {
        return res
          .status(403)
          .json({ message: "You are not authorized to review this task." });
      }
      if (taskDoc.data().status !== "submitted") {
        return res
          .status(400)
          .json({ message: "Task is not in submitted status for review." });
      }

      await taskRef.update({
        status,
        managerFeedback: managerFeedback || "",
        reviewedAt: new Date(),
        lastUpdated: new Date(),
      });
      res.status(200).json({ message: `Task ${status} successfully.` });
    } catch (error) {
      console.error("Error reviewing task:", error);
      res.status(500).json({ message: "Failed to review task." });
    }
  }
);

module.exports = router;
