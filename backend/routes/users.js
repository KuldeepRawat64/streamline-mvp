// backend/routes/users.js
const express = require("express");
const { db, auth } = require("../config/firebaseAdmin");
const {
  authenticateToken,
  authorizeRole,
} = require("../middleware/authMiddleware");

const router = express.Router();

// Get user profile (authenticated users)
router.get("/users/me", authenticateToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User profile not found." });
    }
    res.status(200).json(userDoc.data());
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile." });
  }
});

// Create/Update user profile on first login (e.g., set role, name)
// This endpoint would be called by the frontend after a successful Firebase Auth login
router.post("/users/profile", authenticateToken, async (req, res) => {
  const { name, role } = req.body; // role: 'manager' or 'team_member'
  if (!name || !role) {
    return res.status(400).json({ message: "Name and role are required." });
  }
  if (!["manager", "team_member"].includes(role)) {
    return res.status(400).json({ message: "Invalid role provided." });
  }

  try {
    const userRef = db.collection("users").doc(req.user.uid);
    await userRef.set(
      {
        uid: req.user.uid,
        phoneNumber: req.user.phoneNumber,
        name,
        role,
        createdAt: new Date(),
        lastLogin: new Date(),
      },
      { merge: true }
    ); // Use merge to update existing fields or create new document

    // Set custom claims for role-based access control (important!)
    await auth.setCustomUserClaims(req.user.uid, { role });

    res.status(200).json({
      message: "User profile created/updated successfully.",
      user: { uid: req.user.uid, name, role },
    });
  } catch (error) {
    console.error("Error creating/updating user profile:", error);
    res.status(500).json({ message: "Failed to create/update user profile." });
  }
});

// Get all team members (Manager only)
router.get(
  "/users/team-members",
  authenticateToken,
  authorizeRole(["manager"]),
  async (req, res) => {
    try {
      const teamMembersSnapshot = await db
        .collection("users")
        .where("role", "==", "team_member")
        .get();
      const teamMembers = teamMembersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.status(200).json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members." });
    }
  }
);

module.exports = router;
