import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 w-full">
          <header className="bg-white border-b px-6 py-4 flex items-center shadow-sm">
            <Link to="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Dataset Lab
            </Link>
          </header>
          <main className="flex-1 p-6 container mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/project/:name" element={<Workspace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
