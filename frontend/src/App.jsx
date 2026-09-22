import { Link, Route, Routes } from 'react-router-dom';
import { GuestOnly, ProtectedRoute } from './components/Routes.jsx';
import { AdminLayout, MainLayout } from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import TestDetails from './pages/TestDetails.jsx';
import Exam from './pages/Exam.jsx';
import Result from './pages/Result.jsx';
import Review from './pages/Review.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import MyTests from './pages/MyTests.jsx';
import Help from './pages/Help.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminUserDetails from './pages/admin/AdminUserDetails.jsx';
import AdminTests from './pages/admin/AdminTests.jsx';
import AdminTestEditor from './pages/admin/AdminTestEditor.jsx';
import AdminAttempts from './pages/admin/AdminAttempts.jsx';

function NotFound() {
  return (
    <div className="center-page">
      <h1>Page not found</h1>
      <Link className="btn btn-primary" to="/">Go to tests</Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
      {/* Guide is public so people can read it before registering */}
      <Route path="/help" element={<Help />} />

      {/* Exam runs full-screen without the site navbar */}
      <Route path="/exam/:attemptId" element={<ProtectedRoute><Exam /></ProtectedRoute>} />

      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="tests/:testId" element={<TestDetails />} />
        <Route path="result/:attemptId" element={<Result />} />
        <Route path="review/:attemptId" element={<Review />} />
        <Route path="leaderboard/:testId" element={<Leaderboard />} />
        <Route path="my-tests" element={<MyTests />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetails />} />
        <Route path="tests" element={<AdminTests />} />
        <Route path="tests/new" element={<AdminTestEditor />} />
        <Route path="tests/:testId" element={<AdminTestEditor />} />
        <Route path="attempts" element={<AdminAttempts />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
