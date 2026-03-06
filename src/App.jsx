import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import BrainLayout from "@/layout/BrainLayout";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/brain/DashboardPage";
import TerminalPage from "@/pages/brain/TerminalPage";
import AIConversationsPage from "@/pages/brain/AIConversationsPage";
import WebActivityPage from "@/pages/brain/WebActivityPage";
import TranscriptsPage from "@/pages/brain/TranscriptsPage";
import NotesPage from "@/pages/brain/NotesPage";
import IssuesPage from "@/pages/brain/IssuesPage";
import GlobalSearchPage from "@/pages/brain/GlobalSearchPage";
import ProfilePage from "@/pages/brain/ProfilePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login"    element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/"         element={<Navigate to="/dashboard" replace />} />
              <Route element={<BrainLayout />}>
                <Route path="/dashboard"   element={<DashboardPage />} />
                <Route path="/terminal"    element={<TerminalPage />} />
                <Route path="/ai"          element={<AIConversationsPage />} />
                <Route path="/web"         element={<WebActivityPage />} />
                <Route path="/transcripts" element={<TranscriptsPage />} />
                <Route path="/notes"       element={<NotesPage />} />
                <Route path="/issues"      element={<IssuesPage />} />
                <Route path="/search"      element={<GlobalSearchPage />} />
                <Route path="/profile"     element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
