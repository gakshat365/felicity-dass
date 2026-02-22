import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import BrowseEvents from './pages/BrowseEvents';
import EventDetails from './pages/EventDetails';
import CreateEvent from './pages/CreateEvent';
import EditEvent from './pages/EditEvent';
import MyEvents from './pages/MyEvents';
import MyRegistrations from './pages/MyRegistrations';
import OrganizersList from './pages/OrganizersList';
import OrganizerProfile from './pages/OrganizerProfile';
import AdminDashboard from './pages/AdminDashboard';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import PaymentUpload from './pages/PaymentUpload';
import Scanner from './pages/Scanner';
import Navbar from './components/Navbar';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#161b22',
              color: '#c9d1d9',
              border: '1px solid #30363d',
            },
            success: {
              iconTheme: {
                primary: '#3fb950',
                secondary: '#161b22',
              },
            },
            error: {
              iconTheme: {
                primary: '#f85149',
                secondary: '#161b22',
              },
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-registrations"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <MyRegistrations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizers"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <OrganizersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizers/:id"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <OrganizerProfile />
              </ProtectedRoute>
            }
          />
          <Route path="/events" element={<BrowseEvents />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route
            path="/events/create"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/edit/:id"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <EditEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/my-events"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <MyEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/organizer/:id"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <OrganizerEventDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/registration/:id/payment"
            element={
              <ProtectedRoute allowedRoles={['participant']}>
                <PaymentUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scanner"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                <Scanner />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
