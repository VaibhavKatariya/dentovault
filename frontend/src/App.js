import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PatientList from "@/pages/PatientList";
import PatientDetail from "@/pages/PatientDetail";
import Upload from "@/pages/Upload";
import Settings from "@/pages/Settings";
import AuditLogs from "@/pages/AuditLogs";

function Shell({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Shell><Dashboard /></Shell>} />
          <Route path="/patients" element={<Shell><PatientList /></Shell>} />
          <Route path="/patients/:id" element={<Shell><PatientDetail /></Shell>} />
          <Route path="/patients/:id/upload" element={<Shell><Upload /></Shell>} />
          <Route path="/audit" element={<Shell><AuditLogs /></Shell>} />
          <Route path="/settings" element={<Shell><Settings /></Shell>} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}