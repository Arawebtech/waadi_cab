import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
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
import CustomerLogsPage from './components/CustomerLogsPage';
import AuditTrailPage from './components/AuditTrailPage';
import PaymentGatewaySettings from './components/PaymentGatewaySettings';
import { SkeletonRows } from './components/cab/PageStates';

const CabOperationsDashboard = React.lazy(() => import('./pages/CabOperationsDashboard'));
const CabDrivers = React.lazy(() => import('./pages/CabDrivers'));
const CabCustomers = React.lazy(() => import('./pages/CabCustomers'));
const CabRides = React.lazy(() => import('./pages/CabRides'));
const CabSubscriptions = React.lazy(() => import('./pages/CabSubscriptions'));
const CabWallets = React.lazy(() => import('./pages/CabWallets'));
const CabVerifications = React.lazy(() => import('./pages/CabVerifications'));
const CabVerificationHistory = React.lazy(() => import('./pages/CabVerificationHistory'));
const CabReports = React.lazy(() => import('./pages/CabReports'));
const CabAdmins = React.lazy(() => import('./pages/CabAdmins'));
const CabLiveFleet = React.lazy(() => import('./pages/CabLiveFleet'));

const PageLoader = () => (
  <div className="p-6"><SkeletonRows rows={8} cols={4} /></div>
);

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ConfirmProvider>
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
                    <Route path="cab-operations" element={<Suspense fallback={<PageLoader />}><CabOperationsDashboard /></Suspense>} />
                    <Route path="cab-drivers" element={<Suspense fallback={<PageLoader />}><CabDrivers /></Suspense>} />
                    <Route path="cab-customers" element={<Suspense fallback={<PageLoader />}><CabCustomers /></Suspense>} />
                    <Route path="cab-rides" element={<Suspense fallback={<PageLoader />}><CabRides /></Suspense>} />
                    <Route path="cab-subscriptions" element={<Suspense fallback={<PageLoader />}><CabSubscriptions /></Suspense>} />
                    <Route path="cab-wallets" element={<Suspense fallback={<PageLoader />}><CabWallets /></Suspense>} />
                    <Route path="cab-verifications" element={<Suspense fallback={<PageLoader />}><CabVerifications /></Suspense>} />
                    <Route path="cab-verifications/history" element={<Suspense fallback={<PageLoader />}><CabVerificationHistory /></Suspense>} />
                    <Route path="cab-reports" element={<Suspense fallback={<PageLoader />}><CabReports /></Suspense>} />
                    <Route path="cab-live-fleet" element={<Suspense fallback={<PageLoader />}><CabLiveFleet /></Suspense>} />
                    <Route path="cab-admins" element={<Suspense fallback={<PageLoader />}><CabAdmins /></Suspense>} />
                    <Route path="notifications" element={<Notifications />} />
                    <Route path="customer-logs" element={<CustomerLogsPage />} />
                    <Route path="audit-trail" element={<AuditTrailPage />} />
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
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
