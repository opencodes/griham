import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, ShieldCheck, Car, Home, Laptop, FileText } from 'lucide-react';

type AssetType = 'Property' | 'Vehicle' | 'Gadget' | 'Document';

interface AssetItem {
  id: string;
  type: AssetType;
  name: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  location?: string;
  expiryDate?: string;
}

const getAssetIcon = (type: AssetType) => {
  if (type === 'Property') return <Home className="w-4 h-4 text-indigo-500" />;
  if (type === 'Vehicle') return <Car className="w-4 h-4 text-blue-500" />;
  if (type === 'Gadget') return <Laptop className="w-4 h-4 text-purple-500" />;
  return <FileText className="w-4 h-4 text-amber-500" />;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysTo = (value?: string) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function Assets() {
  const [activeTab, setActiveTab] = useState('assets');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [assets, setAssets] = useState<AssetItem[]>([
    {
      id: 'ast-1',
      type: 'Property',
      name: 'Apartment - Noida',
      purchaseDate: '2020-08-15',
      purchasePrice: 6500000,
      currentValue: 8900000,
      location: 'Sector 137, Noida',
    },
    {
      id: 'ast-2',
      type: 'Vehicle',
      name: 'Hyundai Creta',
      purchaseDate: '2022-06-20',
      purchasePrice: 1650000,
      currentValue: 1280000,
      location: 'Home Parking',
      expiryDate: '2026-04-11',
    },
    {
      id: 'ast-3',
      type: 'Document',
      name: 'Family Health Insurance',
      purchaseDate: '2025-01-10',
      purchasePrice: 42000,
      currentValue: 42000,
      expiryDate: '2026-03-30',
    },
  ]);

  const [formData, setFormData] = useState({
    type: 'Gadget' as AssetType,
    name: '',
    purchaseDate: '',
    purchasePrice: '',
    currentValue: '',
    location: '',
    expiryDate: '',
  });

  const totalValuation = useMemo(
    () => assets.reduce((acc, item) => acc + Number(item.currentValue || 0), 0),
    [assets]
  );
  const expiringSoon = useMemo(
    () => assets.filter((item) => item.expiryDate && (daysTo(item.expiryDate) ?? 9999) <= 30 && (daysTo(item.expiryDate) ?? -1) >= 0).length,
    [assets]
  );
  const insuredAssets = useMemo(() => assets.filter((item) => item.expiryDate).length, [assets]);

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.purchaseDate) return;

    setAssets((prev) => [
      ...prev,
      {
        id: `ast-${Date.now()}`,
        type: formData.type,
        name: formData.name,
        purchaseDate: formData.purchaseDate,
        purchasePrice: Number(formData.purchasePrice || 0),
        currentValue: Number(formData.currentValue || 0),
        location: formData.location || undefined,
        expiryDate: formData.expiryDate || undefined,
      },
    ]);

    setShowModal(false);
    setFormData({
      type: 'Gadget',
      name: '',
      purchaseDate: '',
      purchasePrice: '',
      currentValue: '',
      location: '',
      expiryDate: '',
    });
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen overflow-hidden app-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        isCollapsed={sidebarCollapsed}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMobileMenuToggle={handleMenuToggle} />

        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Assets</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage properties, vehicles, gadgets and documents</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Asset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Valuation</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{formatCurrency(totalValuation)}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Expiring In 30 Days</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{expiringSoon}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">With Insurance/Expiry</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{insuredAssets}</p>
              </div>
            </div>

            <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Asset Registry</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{assets.length} assets</p>
              </div>

              <div className="space-y-1.5">
                {assets.map((asset) => {
                  const expiryDays = daysTo(asset.expiryDate);
                  return (
                    <article
                      key={asset.id}
                      className="rounded-lg border border-[var(--panel-border)] px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 glass-black-soft"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex items-start gap-2.5">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            {getAssetIcon(asset.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                {asset.type}
                              </span>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{asset.name}</p>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              Purchase: {formatDate(asset.purchaseDate)} • Cost: {formatCurrency(asset.purchasePrice)} • Current: {formatCurrency(asset.currentValue)}
                              {asset.location ? ` • ${asset.location}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {asset.expiryDate ? (
                            <p className={`font-semibold text-sm ${(expiryDays ?? 999) <= 30 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                              Exp: {formatDate(asset.expiryDate)}
                            </p>
                          ) : (
                            <p className="font-semibold text-sm text-gray-400 dark:text-gray-500">No expiry</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}

                {assets.length === 0 && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">No assets added yet</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleAddAsset} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Asset</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as AssetType }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Property">Property</option>
                  <option value="Vehicle">Vehicle</option>
                  <option value="Gadget">Gadget</option>
                  <option value="Document">Document</option>
                </select>

                <input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Asset name"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />

                <input
                  type="date"
                  value={formData.purchaseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  type="number"
                  min="0"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchasePrice: e.target.value }))}
                  placeholder="Purchase price"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <input
                  type="number"
                  min="0"
                  value={formData.currentValue}
                  onChange={(e) => setFormData((prev) => ({ ...prev, currentValue: e.target.value }))}
                  placeholder="Current value"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Location (optional)"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expiryDate: e.target.value }))}
                  className="md:col-span-2 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Keep values and expiry details updated for better reminders and valuation tracking.</span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg ai-gradient-button text-white"
                >
                  Save Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
