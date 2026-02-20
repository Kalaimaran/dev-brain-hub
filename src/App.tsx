import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ConsoleLayout from "@/components/ConsoleLayout";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/Dashboard";
import DataExplorerPage from "@/pages/DataExplorer";
import SemanticSearchPage from "@/pages/SemanticSearch";
import APIPlaygroundPage from "@/pages/APIPlayground";
import UsagePage from "@/pages/Usage";
import ApiLogsPage from "@/pages/ApiLogs";
import SettingsPage from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ConsoleLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/data" element={<DataExplorerPage />} />
              <Route path="/search" element={<SemanticSearchPage />} />
              <Route path="/playground" element={<APIPlaygroundPage />} />
              <Route path="/usage" element={<UsagePage />} />
              <Route path="/logs" element={<ApiLogsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
