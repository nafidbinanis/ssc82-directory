import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Directory from './pages/Directory';
import PersonDetail from './pages/PersonDetail';
import PersonForm from './pages/PersonForm';
import ActivityLog from './pages/ActivityLog';

function Protected({ children, adminOnly }) {
  return (
    <ProtectedRoute adminOnly={adminOnly}>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/directory" element={<Protected><Directory /></Protected>} />
          <Route path="/directory/new" element={<Protected adminOnly><PersonForm /></Protected>} />
          <Route path="/directory/:id" element={<Protected><PersonDetail /></Protected>} />
          <Route path="/directory/:id/edit" element={<Protected adminOnly><PersonForm /></Protected>} />
          <Route path="/activity" element={<Protected adminOnly><ActivityLog /></Protected>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
