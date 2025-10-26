import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import TableMenu from "./pages/TableMenu";
import DemoStore from "./pages/DemoStore";
import WaiterDashboard from "./pages/WaiterDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import OrderThanks from "./pages/OrderThanks";
import CookDashboard from "./pages/CookDashboard";
import './i18n/config';

const queryClient = new QueryClient();

function OfflineBadge() {
  const [off, setOff] = useState(false);
  useEffect(() => {
    try { setOff(localStorage.getItem('OFFLINE') === '1'); } catch {}
  }, []);
  return (
    <button
      onClick={() => {
        try {
          const next = !off; localStorage.setItem('OFFLINE', next ? '1' : '0');
          setOff(next); window.location.reload();
        } catch {}
      }}
      title={off ? 'Offline mocks: ON (click to turn off)' : 'Offline mocks: OFF (click to turn on)'}
      className={`fixed z-50 top-2 left-2 rounded-full px-3 py-1 text-xs font-medium shadow ${off ? 'bg-amber-500 text-white' : 'bg-gray-700 text-white/90'}`}
    >
      {off ? 'Offline: On' : 'Offline: Off'}
    </button>
  );
}

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <OfflineBadge />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/table/:tableId" element={<TableMenu />} />
            <Route path="/demo/store/:demoSlug" element={<DemoStore />} />
            <Route path="/order/:orderId/thanks" element={<OrderThanks />} />
            <Route path="/waiter" element={<WaiterDashboard />} />
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/cook" element={<CookDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
