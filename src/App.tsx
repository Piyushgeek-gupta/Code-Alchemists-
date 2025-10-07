import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import LanguageSelection from "./pages/LanguageSelection";
import Contest from "./pages/Contest";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./hooks/useAuth";
import { AdminRoute } from "./components/AdminRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { Questions } from "./pages/admin/Questions";
import { Contests } from "./pages/admin/Contests";
import { Participants } from "./pages/admin/Participants";
import { Leaderboard } from "./pages/admin/Leaderboard";
import { Submissions } from "./pages/admin/Submissions";
import { Analytics } from "./pages/admin/Analytics";
import { Announcements } from "./pages/admin/Announcements";
import { Settings } from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/language-selection" element={<LanguageSelection />} />
            <Route path="/contest" element={<Contest />} />
            <Route path="/results" element={<Results />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="questions" element={<Questions />} />
              <Route path="contests" element={<Contests />} />
              <Route path="participants" element={<Participants />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="submissions" element={<Submissions />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
