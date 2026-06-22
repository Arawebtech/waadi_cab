import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import States from './pages/States';
import VehicleTypes from './pages/VehicleTypes';
import Plans from './pages/Plans';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import WhatsApp from './pages/WhatsApp';
import Notifications from './pages/Notifications';
import AppStatus from './pages/AppStatus';
import InsuranceInquiries from './pages/InsuranceInquiries';
import CabBookings from './pages/CabBookings';
import AppVersions from './pages/AppVersions';
// import './App.css';
// import './index';
import CustomerLogsPage from './components/CustomerLogsPage';
import PaymentGatewaySettings from './components/PaymentGatewaySettings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/:id" element={<Bookings />} />
              <Route path="users" element={<Users />} />
              <Route path="states" element={<States />} />
              <Route path="vehicle-types" element={<VehicleTypes />} />
              <Route path="plans" element={<Plans />} />
              <Route path="whatsapp" element={<WhatsApp />} />
              <Route path="insurance-inquiries" element={<InsuranceInquiries />} />
              <Route path="cab-bookings" element={<CabBookings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="customer-logs" element={<CustomerLogsPage />} />
              <Route path="payment-change" element={<PaymentGatewaySettings />} />
              <Route path="app-status" element={<AppStatus />} />
              <Route path="app-versions" element={<AppVersions />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
