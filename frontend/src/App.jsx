import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import './App.css';
import LandingPage from "./pages/Landing";
import AdminLayout from "./pages/admin/AdminLayout";
import Profile from "./pages/admin/profile";
import Edit from "./pages/admin/edit";
import Dashboard from "./pages/admin/dashboard";
import Laboratory from "./pages/admin/labs";
import Reports from "./pages/admin/reports";
import Users from "./pages/admin/users";

import TechnicianLayout from "./pages/technician/TechnicianLayout";
import TechnicianDashboard from "./pages/technician/TechnicianDashboard";
import TechnicianLabs from "./pages/technician/TechnicianLabs";
import TechnicianEdit from "./pages/technician/TechnicianEdit";

import LabGrid from "./pages/admin/components/LabGrid";
import AddLabModal from "./pages/admin/components/AddLabModal";
import LabDetail from './pages/admin/components/LabDetail';
import AddComputerModal from './pages/admin/components/AddComputerModal';

import DeanLayout from "./pages/dean/deanLayout";
import DeanLabs from "./pages/dean/DeanLabs";
import DeanEdit from "./pages/dean/DeanEdit";
import User from "./pages/dean/User";
import AdminOnboardingModal from "./components/AdminOnboardingModal";
import ITSDLayout from "./pages/itsd/ITSDLayout";
import ITSDDashboard from "./pages/itsd/ITSDDashboard";
import ITSDUsers from "./pages/itsd/ITSDUsers";
import ITSDLabs from "./pages/itsd/ITSDLabs";
import ITSDReports from "./pages/itsd/ITSDReports";
import ITSDEdit from "./pages/itsd/ITSDEdit";
import ProtectedRoute from "./components/ProtectedRoute";







function RouteWithTransitions() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="page-container"
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />

          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="profile" element={<Profile />} />
            <Route path="edit" element={<Edit />} />
            <Route path="labs" element={<Laboratory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="LabGrid" element={<LabGrid />} />
            <Route path="AddLabModal" element={<AddLabModal />} />
            <Route path="LabDetail" element={<LabDetail />} />
            <Route path="LabDetail" element={<LabDetail />} />
            <Route path="AddComputerModal" element={<AddComputerModal />} />
            <Route path="users" element={<Users />} />
          </Route>

          <Route path="/technician" element={
            <ProtectedRoute allowedRoles={['technician']}>
              <TechnicianLayout />
            </ProtectedRoute>
          }>
            <Route index element={<TechnicianDashboard />} />
            <Route path="TechnicianLabs" element={<TechnicianLabs />} />
            <Route path="TechnicianEdit" element={<TechnicianEdit />} />

          </Route>

          <Route path="/dean" element={
            <ProtectedRoute allowedRoles={['dean']}>
              <DeanLayout />
            </ProtectedRoute>
          }>
            <Route index element={<TechnicianDashboard />} />
            <Route path="DeanLabs" element={<DeanLabs />} />
            <Route path="DeanEdit" element={<DeanEdit />} />
            <Route path="User" element={<User />} />
          </Route>

          <Route path="/itsd" element={
            <ProtectedRoute allowedRoles={['itsd']}>
              <ITSDLayout />
            </ProtectedRoute>
          }>
            <Route index element={<ITSDDashboard />} />
            <Route path="users" element={<ITSDUsers />} />
            <Route path="labs" element={<ITSDLabs />} />
            <Route path="reports" element={<ITSDReports />} />
            <Route path="edit" element={<ITSDEdit />} />
          </Route>

        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}


function OnboardingWrapper() {
  const { showOnboarding, completeOnboarding } = useAuth();

  return (
    <AdminOnboardingModal
      show={showOnboarding}
      onComplete={completeOnboarding}
    />
  );
}


function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <RouteWithTransitions />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
          <OnboardingWrapper />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
