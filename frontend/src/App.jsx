// src/PrivateRoute.jsx
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { getIdTokenResult } from "firebase/auth";
import { auth } from "./firebaseConfig";
import LoadingSpinner from "./components/LoadingSpinner";

function PrivateRoute({ children, role }) {
  const [user, loading] = useAuthState(auth);
  const [checkingRole, setCheckingRole] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (user) {
        try {
          const tokenResult = await getIdTokenResult(user, true);
          const roleFromClaims = tokenResult.claims.role;
          setUserRole(roleFromClaims);
        } catch (error) {
          console.error("Error fetching role:", error);
        }
      }
      setCheckingRole(false);
    };

    fetchRole();
  }, [user]);

  if (loading || checkingRole) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

export default PrivateRoute;
