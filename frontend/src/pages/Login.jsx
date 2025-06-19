// // src/pages/Login.jsx
// import React, { useState, useEffect } from "react";
// import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
// import { auth } from "../firebaseConfig";
// import { useNavigate } from "react-router-dom";

// const Login = () => {
//   const [phoneNumber, setPhoneNumber] = useState("");
//   const [otp, setOtp] = useState("");
//   const [confirmationResult, setConfirmationResult] = useState(null);
//   const [error, setError] = useState("");
//   const [otpSent, setOtpSent] = useState(false);
//   const [recaptchaReady, setRecaptchaReady] = useState(false);
//   const [success, setSuccess] = useState(""); // <-- ADD THIS LINE
//   const navigate = useNavigate();

//   useEffect(() => {
//     // Only set up recaptcha once when the component mounts
//     // and if it hasn't been set up yet.
//     // Ensure auth is defined and window is available.
//     if (!window.recaptchaVerifier && auth) {
//       try {
//         window.recaptchaVerifier = new RecaptchaVerifier(
//           "recaptcha-container",
//           {
//             size: "invisible",
//             callback: (response) => {
//               // reCAPTCHA solved - This callback fires when reCAPTCHA is successfully executed.
//               // For invisible reCAPTCHA, this often means it automatically passed.
//               console.log("reCAPTCHA automatically verified:", response);
//               setRecaptchaReady(true); // Indicate reCAPTCHA is ready
//             },
//             "expired-callback": () => {
//               console.warn("reCAPTCHA expired. Please try again.");
//               setError("reCAPTCHA expired. Please try again.");
//               setRecaptchaReady(false); // Indicate reCAPTCHA needs re-init
//             },
//             // The 'error-callback' is important for debugging
//             'error-callback': (err) => {
//               console.error("reCAPTCHA error:", err);
//               setError("reCAPTCHA failed to load. Check console.");
//               setRecaptchaReady(false);
//             }
//           },
//           auth // Pass the Firebase Auth instance
//         );

//         // This will render the invisible badge.
//         window.recaptchaVerifier.render().then((widgetId) => {
//           window.recaptchaWidgetId = widgetId;
//           setRecaptchaReady(true); // Mark reCAPTCHA as ready after rendering
//           console.log("reCAPTCHA widget rendered with ID:", widgetId);
//         }).catch(renderErr => {
//           console.error("Error rendering reCAPTCHA widget:", renderErr);
//           setError("Failed to render reCAPTCHA. Check console.");
//           setRecaptchaReady(false);
//         });

//       } catch (e) {
//         console.error("Error setting up reCAPTCHA:", e);
//         setError("Failed to set up reCAPTCHA. Check console.");
//         setRecaptchaReady(false);
//       }
//     }
//     // Cleanup function if component unmounts
//     return () => {
//         if (window.recaptchaVerifier && window.recaptchaWidgetId) {
//             window.recaptchaVerifier.clear(); // Clears the reCAPTCHA widget
//             delete window.recaptchaVerifier;
//             delete window.recaptchaWidgetId;
//         }
//     };
//   }, []); // Empty dependency array means this runs once on mount

//   const handleSendOtp = async () => {
//     setError("");
//     if (!phoneNumber) {
//       setError("Please enter a phone number.");
//       return;
//     }
//     if (!recaptchaReady) {
//         setError("reCAPTCHA is not ready. Please wait a moment or refresh.");
//         return;
//     }

//     try {
//       // Re-execute reCAPTCHA just before sign-in for invisible mode
//       // For invisible reCAPTCHA, you often don't need to explicitly execute
//       // it again unless it's timed out or you need a fresh token.
//       // Firebase signInWithPhoneNumber automatically handles execution with appVerifier.
//       const appVerifier = window.recaptchaVerifier; // Use the initialized verifier
//       const result = await signInWithPhoneNumber(
//         auth,
//         phoneNumber,
//         appVerifier
//       );
//       setConfirmationResult(result);
//       setOtpSent(true);
//       setSuccess("OTP sent successfully!"); // Use success state for positive messages
//       setPhoneNumber(''); // Clear phone number input after OTP is sent
//     } catch (err) {
//       console.error(err);
//       setError(
//         "Failed to send OTP. Please try again or check your number. " +
//           err.message
//       );
//       // If error occurs, re-render reCAPTCHA for another attempt
//       if (window.recaptchaVerifier) {
//           window.recaptchaVerifier.render().then((widgetId) => {
//             window.recaptchaWidgetId = widgetId;
//             setRecaptchaReady(true);
//           });
//       }
//     }
//   };

//   const handleVerifyOtp = async () => {
//     setError("");
//     if (!otp) {
//       setError("Please enter the OTP.");
//       return;
//     }
//     if (!confirmationResult) {
//         setError("OTP was not sent. Please request a new one.");
//         return;
//     }
//     try {
//       await confirmationResult.confirm(otp);
//       // User signed in successfully.
//       // You can now fetch user data (e.g., roles) from Firestore
//       // and navigate to the appropriate dashboard.
//       // For MVP, navigate to a default dashboard.
//       navigate("/manager"); // Or '/team' based on initial assumption
//     } catch (err) {
//       console.error(err);
//       setError("Invalid OTP. Please try again. " + err.message);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
//         <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">
//           Login to Streamline
//         </h2>
//         {error && (
//           <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
//         )}
//         {success && (
//           <p className="text-green-500 text-sm mt-4 text-center">{success}</p>
//         )}

//         {!otpSent ? (
//           <>
//             <div className="mb-4">
//               <label
//                 htmlFor="phoneNumber"
//                 className="block text-gray-700 text-sm font-bold mb-2"
//               >
//                 Phone Number (e.g., +919876543210)
//               </label>
//               <input
//                 type="tel" // Use type="tel" for phone numbers
//                 id="phoneNumber"
//                 className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
//                 value={phoneNumber}
//                 onChange={(e) => setPhoneNumber(e.target.value)}
//                 placeholder="+91XXXXXXXXXX"
//               />
//             </div>
//             <button
//               onClick={handleSendOtp}
//               className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
//               disabled={!recaptchaReady} // Disable button until reCAPTCHA is ready
//             >
//               {recaptchaReady ? "Send OTP" : "Loading reCAPTCHA..."}
//             </button>
//             {/* The recaptcha-container MUST be in the DOM always for setupRecaptcha to work */}
//             <div id="recaptcha-container" className="mt-4"></div>
//           </>
//         ) : (
//           <>
//             <div className="mb-4">
//               <label
//                 htmlFor="otp"
//                 className="block text-gray-700 text-sm font-bold mb-2"
//               >
//                 Enter OTP
//               </label>
//               <input
//                 type="text"
//                 id="otp"
//                 className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
//                 value={otp}
//                 onChange={(e) => setOtp(e.target.value)}
//                 placeholder="XXXXXX"
//               />
//             </div>
//             <button
//               onClick={handleVerifyOtp}
//               className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
//             >
//               Verify OTP
//             </button>
//             <button
//               onClick={() => { // Allow resending OTP (with new reCAPTCHA)
//                 setOtpSent(false);
//                 setConfirmationResult(null);
//                 setOtp("");
//                 setError("");
//                 setRecaptchaReady(false); // Trigger re-init
//                 // Call setupRecaptcha again or let useEffect handle it if window.recaptchaVerifier is cleared
//                 if (window.recaptchaVerifier) {
//                     window.recaptchaVerifier.clear();
//                     delete window.recaptchaVerifier;
//                     delete window.recaptchaWidgetId;
//                 }
//               }}
//               className="mt-2 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
//             >
//               Resend OTP
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Login;


// frontend/src/pages/Login.jsx
import React from 'react';

const Login = () => {
  console.log('Login component is rendering!'); // Add this log

  return (
    <div style={{
        backgroundColor: 'lightblue',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '48px',
        color: 'darkblue'
      }}>
      Hello from Login!
    </div>
  );
};

export default Login;