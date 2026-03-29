import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import QueuePage from "./pages/QueuePage";
import HistoryPage from "./pages/HistoryPage";
import LayPersonPage from "./pages/LayPersonPage";
import MonkUserPage from "./pages/MonkUserPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/queue" element={<QueuePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/request" element={<LayPersonPage />} />
          <Route path="/monk" element={<MonkUserPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
