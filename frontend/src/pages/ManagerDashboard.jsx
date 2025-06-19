// src/pages/ManagerDashboard.jsx
import React from "react";
import { auth, db } from "../firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const ManagerDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  // Example: Add a task (this will need a proper form)
  const addTask = async () => {
    try {
      await addDoc(collection(db, "tasks"), {
        title: "Sample Task for Team Member X",
        description: "Complete daily report and submit photos.",
        assignedTo: "teamMember123", // Replace with actual user ID
        status: "pending",
        deadline: new Date().toISOString().split("T")[0], // YYYY-MM-DD
        createdAt: serverTimestamp(),
        // Add fields for expected proof (e.g., proofType: 'image', 'checklist')
      });
      alert("Task added successfully!");
    } catch (error) {
      console.error("Error adding task: ", error);
      alert("Failed to add task.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold">Manager Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-white text-indigo-700 font-bold py-2 px-4 rounded-full shadow-lg hover:bg-gray-100 transition duration-300"
        >
          Logout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Task Assignment Card */}
        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white border-opacity-30">
          <h2 className="text-2xl font-semibold mb-4">Assign New Task</h2>
          <p className="text-gray-100 mb-4">
            Click to create and assign tasks to your team members.
          </p>
          <button
            onClick={addTask} // This would open a modal/form in a real app
            className="bg-white text-indigo-700 font-bold py-2 px-5 rounded-full shadow-md hover:bg-gray-100 transition duration-300"
          >
            Create Task
          </button>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white border-opacity-30">
          <h2 className="text-2xl font-semibold mb-4">Pending Approvals</h2>
          <p className="text-gray-100 mb-4">
            Review and approve submitted proofs from your team.
          </p>
          <button
            className="bg-white text-indigo-700 font-bold py-2 px-5 rounded-full shadow-md hover:bg-gray-100 transition duration-300"
            onClick={() =>
              alert("View pending approvals (not yet implemented)")
            }
          >
            View Submissions
          </button>
        </div>

        {/* Team Performance Card */}
        <div className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white border-opacity-30">
          <h2 className="text-2xl font-semibold mb-4">Team Performance</h2>
          <p className="text-gray-100 mb-4">
            Track completion rates and habit consistency metrics.
          </p>
          <button
            className="bg-white text-indigo-700 font-bold py-2 px-5 rounded-full shadow-md hover:bg-gray-100 transition duration-300"
            onClick={() => alert("View team performance (not yet implemented)")}
          >
            View Metrics
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;