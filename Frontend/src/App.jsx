import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import ContestList from './components/ContestList';
import ContestDetail from './components/ContestDetail';
import AdminDashboard from './components/AdminDashboard';
import MobileProctoring from './components/MobileProctoring';

// Custom security wrapper to protect student and admin sections
function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('accessToken');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.role !== role) {
    // If not matching target role, redirect home
    return <Navigate to="/contests" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mobile-proctoring" element={<MobileProctoring />} />
          
          <Route path="/contests" element={
            <ProtectedRoute>
              <ContestList />
            </ProtectedRoute>
          } />
          
          <Route path="/contests/:contestId" element={
            <ProtectedRoute>
              <ContestDetail />
            </ProtectedRoute>
          } />

          <Route path="/admin" element={
            <ProtectedRoute role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/contests" replace />} />
        </Routes>
      </div>
    </Router>
  );
}
