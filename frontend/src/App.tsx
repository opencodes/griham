import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DarkModeProvider } from './hooks/useDarkMode';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FamilyDetail from './pages/FamilyDetail';
import FinanceOverview from './pages/FinanceOverview';
import BankAccounts from './pages/BankAccounts';
import Transactions from './pages/Transactions';
import Bills from './pages/Bills';
import Cards from './pages/Cards';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/families/:id"
        element={
          <ProtectedRoute>
            <FamilyDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/households/:id"
        element={
          <ProtectedRoute>
            <FamilyDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <FinanceOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/accounts"
        element={
          <ProtectedRoute>
            <BankAccounts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/transactions"
        element={
          <ProtectedRoute>
            <Transactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/bills"
        element={
          <ProtectedRoute>
            <Bills />
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/cards"
        element={
          <ProtectedRoute>
            <Cards />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DarkModeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
