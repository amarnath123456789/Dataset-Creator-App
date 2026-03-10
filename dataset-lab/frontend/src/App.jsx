import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import Navbar from './components/Navbar';
import { ToastProvider } from './components/Toast';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-neu-base text-neu-text selection:bg-neu-accent selection:text-white font-sans antialiased overflow-x-hidden">
            <Navbar />
            <main className="flex-1 p-8 container mx-auto max-w-7xl animate-in fade-in duration-500">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/project/:name" element={<Workspace />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
