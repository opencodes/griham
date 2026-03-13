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
import Events from './pages/Events';
import Assets from './pages/Assets';
import Health from './pages/Health';
import Contacts from './pages/Contacts';
import Organizer from './pages/Organizer';
import Messaging from './pages/Messaging';
import RootPermissions from './pages/RootPermissions';
import RootRoles from './pages/RootRoles';
import RootGroups from './pages/RootGroups';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-shell">
        <div className="text-[var(--app-fg)]">Loading...</div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user?.role === 'root') {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/root/permissions" />} />
        <Route
          path="/root/permissions"
          element={
            <ProtectedRoute>
              <RootPermissions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/root/roles"
          element={
            <ProtectedRoute>
              <RootRoles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/root/groups"
          element={
            <ProtectedRoute>
              <RootGroups />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/root/permissions" />} />
      </Routes>
    );
  }

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
        path="/family"
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
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <Events />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <Assets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <Health />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <Contacts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer"
        element={
          <ProtectedRoute>
            <Organizer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messaging />
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
          <div className="premium-shell">
            <AppRoutes />
          </div>
        </AuthProvider>
      </DarkModeProvider>
    </BrowserRouter>
  );
}

export default App;
