// src/pages/TeamMemberTasks.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig"; // Removed 'storage'
import { signOut } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import axios from "axios"; // Import axios

const TeamMemberTasks = () => {
  const [user] = useAuthState(auth);
  const [tasks, setTasks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState(""); // New state for notes
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const navigate = useNavigate();
  const [error, setError] = useState(null); // New state for error messages
  const [success, setSuccess] = useState(false); // New state for success messages

  // Base URL for your backend API
  // In production, this should be an environment variable (e.g., process.env.VITE_API_BASE_URL)
  const API_BASE_URL = "http://localhost:5000/api"; // IMPORTANT: Change this to your actual backend URL

  useEffect(() => {
    if (user) {
      // Fetch user's ID token to include in API calls
      const fetchTasks = async () => {
        try {
          const idToken = await user.getIdToken(); // Get the latest ID token
          // Fetch tasks from your backend, passing the token
          const response = await axios.get(`${API_BASE_URL}/tasks/assigned-to-me`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          setTasks(response.data.map(task => ({
              id: task.id || task._id, // Handle both Firestore 'id' and MongoDB '_id' if you switch DBs later
              ...task
          })));
        } catch (err) {
          console.error("Error fetching tasks from backend: ", err);
          setError("Failed to load tasks. Please try again.");
        }
      };

      fetchTasks();

      // OPTIONAL: Keep onSnapshot if you want real-time updates from Firestore for non-file changes
      // If your backend handles all task updates, you might remove this onSnapshot and rely on re-fetching tasks
      // after every backend action or using WebSockets for real-time updates.
      // For MVP simplicity, you can still use it alongside backend updates.
      const q = query(
        collection(db, "tasks"),
        where("assignedTo", "==", user.uid)
      );
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const userTasks = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTasks(userTasks);
        },
        (error) => {
          console.error("Error fetching tasks from Firestore: ", error);
          // Don't overwrite general error from backend fetch
        }
      );
      return () => unsubscribe();
    }
  }, [user]); // Rerun effect when user changes

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTaskCompletion = async (taskId, proofType) => {
    setError(null);
    setSuccess(false);

    // Basic validation for image proof type
    if (proofType === "image" && !selectedFile) {
      setError("Please select an image file to upload.");
      return;
    }

    setUploadingTaskId(taskId);
    try {
      const idToken = await user.getIdToken(); // Get current user's ID token

      const formData = new FormData();
      if (proofType === "image" && selectedFile) {
        formData.append("proofImage", selectedFile); // 'proofImage' must match the field name in your Multer setup
      }
      formData.append("submissionNotes", submissionNotes); // Add notes to form data

      // Send the file and notes to your backend API
      const response = await axios.post(
        `${API_BASE_URL}/tasks/${taskId}/submit-proof`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data", // axios typically sets this automatically for FormData
            Authorization: `Bearer ${idToken}`,
          },
          onUploadProgress: (progressEvent) => {
            // Optional: show upload progress
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`Upload progress for task ${taskId}: ${percentCompleted}%`);
          },
        }
      );

      // The backend should return the URL where the image is now hosted
      const proofUrl = response.data.imageUrl; // Assuming your backend sends back { imageUrl: "..." }

      // Update Firestore task document with the URL from your backend
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: "submitted",
        submissionProofUrl: proofUrl, // Changed from submissionProof to submissionProofUrl to match backend
        submissionNotes: submissionNotes,
        submittedAt: new Date(),
      });

      setSuccess("Task submitted successfully!");
      setSelectedFile(null); // Clear selected file
      setSubmissionNotes(""); // Clear notes
      setUploadingTaskId(null);

    } catch (err) {
      console.error("Error submitting task: ", err.response ? err.response.data : err.message);
      setError("Failed to submit task. " + (err.response?.data?.message || err.message));
      setUploadingTaskId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-cyan-600 p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold">Today's Tasks</h1>
        <button
          onClick={handleLogout}
          className="bg-white text-blue-700 font-bold py-2 px-4 rounded-full shadow-lg hover:bg-gray-100 transition duration-300"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="bg-red-500 text-white p-3 rounded mb-4 text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500 text-white p-3 rounded mb-4 text-center">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {tasks.length === 0 ? (
          <p className="text-xl text-gray-100 text-center">
            No tasks assigned for today. Keep up the good work!
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl p-6 shadow-xl border border-white border-opacity-30"
            >
              <h2 className="text-2xl font-semibold mb-2">{task.title}</h2>
              <p className="text-gray-100 mb-3">{task.description}</p>
              <p className="text-sm text-gray-200 mb-4">
                Deadline: {new Date(task.deadline.seconds * 1000).toLocaleDateString()} {/* Convert Firestore Timestamp */}
              </p>

              {task.status === "pending" && (
                <div className="flex flex-col gap-3">
                  {/* Input for image file */}
                  {task.proofType === "image" && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-100
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100"
                    />
                  )}
                  {selectedFile && (
                    <p className="text-sm text-gray-200">
                      Selected: {selectedFile.name}
                    </p>
                  )}

                  {/* Text area for submission notes */}
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded text-gray-900"
                    placeholder="Add notes for your submission..."
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                  ></textarea>

                  <button
                    onClick={() => handleTaskCompletion(task.id, task.proofType)}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 flex items-center justify-center"
                    disabled={uploadingTaskId === task.id || (task.proofType === "image" && !selectedFile)} // Disable if no file for image proof
                  >
                    {uploadingTaskId === task.id ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      "Mark as Complete"
                    )}
                  </button>
                </div>
              )}

              {/* Display submitted proof and manager feedback */}
              {(task.status === "submitted" || task.status === "approved" || task.status === "rejected") && (
                <div className="mt-4 border-t border-white border-opacity-30 pt-4">
                    {task.submissionProofUrl && task.proofType === 'image' && (
                        <div className="mb-3">
                            <p className="text-gray-200 text-sm font-semibold mb-2">Submitted Image:</p>
                            <img
                                src={task.submissionProofUrl}
                                alt="Submitted Proof"
                                className="max-w-full h-auto rounded-lg shadow-md border border-white border-opacity-30"
                            />
                        </div>
                    )}
                    {task.submissionNotes && (
                        <p className="text-gray-200 text-sm mb-2">
                            <span className="font-semibold">Notes:</span> {task.submissionNotes}
                        </p>
                    )}
                </div>
              )}

              {task.status === "submitted" && (
                <p className="text-yellow-300 font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Awaiting Approval
                </p>
              )}
              {task.status === "approved" && (
                <p className="text-green-300 font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Approved!
                </p>
              )}
              {task.status === "rejected" && (
                <p className="text-red-300 font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinelinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Rejected. Feedback: {task.managerFeedback || "N/A"}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamMemberTasks;