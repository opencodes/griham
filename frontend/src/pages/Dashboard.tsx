import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, Household } from '@/lib/api';
import { Home, Plus, Users, Menu, Bell, Flame } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('family');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'family') {
      loadHouseholds();
    } else if (activeTab === 'finance') {
      window.location.href = '/finance';
    }
  }, [activeTab]);

  const loadHouseholds = async () => {
    try {
      const data = await householdAPI.list();
      setHouseholds(data);
    } catch (error) {
      console.error('Failed to load households', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await householdAPI.create(name, address);
      setShowModal(false);
      setName('');
      setAddress('');
      loadHouseholds();
    } catch (error) {
      console.error('Failed to create household', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{households.length}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Family</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'family' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">My Family</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your family</p>
                </div>
                {households.length === 0 && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Create Family
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {households.map((household) => (
                  <div 
                    key={household.id} 
                    onClick={() => window.location.href = `/families/${household.id}`}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">{household.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                      {household.address || 'No address'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Created {new Date(household.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}

                {households.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300 mb-2">No family yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Create your first family to get started</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab !== 'dashboard' && activeTab !== 'family' && activeTab !== 'finance' && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300 text-lg">Coming soon...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This module will be available in Phase 2</p>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-300 text-lg">Redirecting to Finance...</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Family Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Create Family</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Family Name
                </label>
                <input
                  type="text"
                  placeholder="My Home"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  placeholder="123 Main St"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
