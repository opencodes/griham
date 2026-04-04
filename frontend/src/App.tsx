import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DarkModeProvider } from './hooks/useDarkMode';
import { FinanceMonthProvider } from './contexts/FinanceMonthContext';
import { AppSettingsProvider } from './contexts/AppSettingsContext';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import FamilyDetail from './pages/FamilyDetail';
import FinanceOverview from './pages/FinanceOverview';
import BankAccounts from './pages/BankAccounts';
import AccountDetails from './pages/AccountDetails';
import Transactions from './pages/Transactions';
import Bills from './pages/Bills';
import Cards from './pages/Cards';
import CardDetails from './pages/CardDetails';
import Insurance from './pages/Insurance';
import Investments from './pages/Investments';
import Loans from './pages/Loans';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Assets from './pages/Assets';
import Health from './pages/Health';
import Contacts from './pages/Contacts';
import Organizer from './pages/Organizer';
import Messaging from './pages/Messaging';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';
import AIUsage from './pages/AIUsage';
import RootPermissions from './pages/RootPermissions';
import RootRoles from './pages/RootRoles';
import RootUsers from './pages/RootUsers';
import RootGroups from './pages/RootGroups';
import RootPromptLab from './pages/RootPromptLab';
import { canAccessModule, isAdminUser } from './lib/permissions';

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

function PermissionRoute({ children, moduleKey }: { children: React.ReactNode; moduleKey: string }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!canAccessModule(user, moduleKey)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
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
          path="/root/users"
          element={
            <ProtectedRoute>
              <RootUsers />
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
        <Route
          path="/root/prompts"
          element={
            <ProtectedRoute>
              <RootPromptLab />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/root/prompts" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
      <Route path="/reset-password" element={isAuthenticated ? <Navigate to="/" /> : <ResetPassword />} />
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
            <PermissionRoute moduleKey="family">
              <FamilyDetail />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/family/:id"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="family">
              <FamilyDetail />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/households/:id"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="family">
              <FamilyDetail />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <FinanceOverview />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/accounts"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <BankAccounts />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/accounts/:accountId"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <AccountDetails />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/transactions"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <Transactions />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/bills"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <Bills />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/cards"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <Cards />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/cards/:cardId"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <CardDetails />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/insurance"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <Insurance />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/investments"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <Investments />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/finance/loans"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="finance">
              <Loans />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="events">
              <Events />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:eventId"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="events">
              <EventDetail />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="assets">
              <Assets />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/health"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="health">
              <Health />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="contacts">
              <Contacts />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizer"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="organizer">
              <Organizer />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="messages">
              <Messaging />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <Assistant />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <PermissionRoute moduleKey="events">
              <Settings />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-usage"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AIUsage />
            </AdminRoute>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <HashRouter>
      <DarkModeProvider>
        <AuthProvider>
          <AppSettingsProvider>
            <FinanceMonthProvider>
              <div className="premium-shell">
                <AppRoutes />
              </div>
            </FinanceMonthProvider>
          </AppSettingsProvider>
        </AuthProvider>
      </DarkModeProvider>
    </HashRouter>
  );
}

export default App;
