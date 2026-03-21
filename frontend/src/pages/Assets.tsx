import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { assetsAPI, householdAPI, type Asset } from '@/lib/api';
import { Plus, ShieldCheck, Car, Home, Laptop, FileText, Pencil, Trash2 } from 'lucide-react';

type AssetTypeLabel = 'Property' | 'Vehicle' | 'Gadget' | 'Document';
type AssetFormType = Asset['asset_type'];

const assetTypeLabelMap: Record<AssetFormType, AssetTypeLabel> = {
  property: 'Property',
  vehicle: 'Vehicle',
  gadget: 'Gadget',
  document: 'Document',
};

const getAssetIcon = (type: AssetFormType) => {
  if (type === 'property') return <Home className="w-4 h-4 text-indigo-500" />;
  if (type === 'vehicle') return <Car className="w-4 h-4 text-blue-500" />;
  if (type === 'gadget') return <Laptop className="w-4 h-4 text-purple-500" />;
  return <FileText className="w-4 h-4 text-amber-500" />;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const daysTo = (value?: string | null) => {
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
  const [familyId, setFamilyId] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');

  const [formData, setFormData] = useState({
    asset_type: 'gadget' as AssetFormType,
    name: '',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    location: '',
    expiry_date: '',
  });

  useEffect(() => {
    void loadFamily();
  }, []);

  useEffect(() => {
    if (!familyId) return;
    void loadAssets(familyId);
  }, [familyId]);

  const loadFamily = async () => {
    try {
      const families = await householdAPI.list();
      if (families.length > 0) {
        setFamilyId(families[0].id);
        setLoadError('');
        return;
      }
      setLoadError('Create a family first to start tracking assets.');
    } catch (error) {
      console.error('Failed to load family', error);
      setLoadError('Failed to load your family.');
    }
  };

  const loadAssets = async (currentFamilyId: string) => {
    setIsLoading(true);
    try {
      const data = await assetsAPI.listAssets(currentFamilyId);
      setAssets(data);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load assets', error);
      setLoadError('Failed to load assets.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      asset_type: 'gadget',
      name: '',
      purchase_date: '',
      purchase_price: '',
      current_value: '',
      location: '',
      expiry_date: '',
    });
  };

  const openAddModal = () => {
    setEditingAsset(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      asset_type: asset.asset_type,
      name: asset.name,
      purchase_date: asset.purchase_date ?? '',
      purchase_price: String(asset.purchase_price ?? ''),
      current_value: String(asset.current_value ?? ''),
      location: asset.location ?? '',
      expiry_date: asset.expiry_date ?? '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAsset(null);
    resetForm();
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyId || !formData.name || !formData.purchase_date) return;

    setIsSaving(true);
    try {
      const payload = {
        asset_type: formData.asset_type,
        name: formData.name.trim(),
        purchase_date: formData.purchase_date,
        purchase_price: Number(formData.purchase_price || 0),
        current_value: Number(formData.current_value || 0),
        location: formData.location || undefined,
        expiry_date: formData.asset_type === 'document' ? formData.expiry_date || undefined : undefined,
      };

      if (editingAsset) {
        await assetsAPI.updateAsset(familyId, editingAsset.id, payload);
      } else {
        await assetsAPI.createAsset(familyId, payload);
      }

      closeModal();
      await loadAssets(familyId);
    } catch (error) {
      console.error('Failed to save asset', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!familyId || deletingAssetId) return;
    if (!window.confirm(`Delete "${asset.name}"?`)) return;

    setDeletingAssetId(asset.id);
    try {
      await assetsAPI.deleteAsset(familyId, asset.id);
      if (editingAsset?.id === asset.id) closeModal();
      await loadAssets(familyId);
    } catch (error) {
      console.error('Failed to delete asset', error);
    } finally {
      setDeletingAssetId(null);
    }
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const totalValuation = useMemo(
    () => assets.reduce((acc, item) => acc + Number(item.current_value || 0), 0),
    [assets]
  );
  const expiringSoon = useMemo(
    () => assets.filter((item) => item.expiry_date && (daysTo(item.expiry_date) ?? 9999) <= 30 && (daysTo(item.expiry_date) ?? -1) >= 0).length,
    [assets]
  );
  const insuredAssets = useMemo(() => assets.filter((item) => item.expiry_date).length, [assets]);

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
                onClick={openAddModal}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-60"
                type="button"
                disabled={!familyId}
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
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Asset Registry</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{assets.length} assets</p>
              </div>

              {loadError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  {loadError}
                </div>
              )}

              <div className="space-y-0">
                {assets.map((asset) => {
                  const expiryDays = daysTo(asset.expiry_date);
                  return (
                    <article
                      key={asset.id}
                      className="px-3 py-2.5 transition hover:bg-black/5 dark:hover:bg-white/10 border-b border-[var(--panel-border)] last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex items-start gap-2.5">
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            {getAssetIcon(asset.asset_type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                {assetTypeLabelMap[asset.asset_type]}
                              </span>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{asset.name}</p>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              Purchase: {formatDate(asset.purchase_date)} • Cost: {formatCurrency(asset.purchase_price)} • Current: {formatCurrency(asset.current_value)}
                              {asset.location ? ` • ${asset.location}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {asset.expiry_date ? (
                            <p className={`font-semibold text-sm ${(expiryDays ?? 999) <= 30 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                              Exp: {formatDate(asset.expiry_date)}
                            </p>
                          ) : (
                            <p className="font-semibold text-sm text-gray-400 dark:text-gray-500">No expiry</p>
                          )}
                          <div className="mt-2 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(asset)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition"
                              aria-label={`Edit ${asset.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteAsset(asset)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 transition disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Delete ${asset.name}`}
                              disabled={deletingAssetId === asset.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!isLoading && assets.length === 0 && !loadError && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">No assets added yet</div>
                )}

                {isLoading && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400">Loading assets...</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleSaveAsset} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{editingAsset ? 'Edit Asset' : 'Add Asset'}</h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Type</span>
                  <select
                    value={formData.asset_type}
                    onChange={(e) =>
                      setFormData((prev) => {
                        const assetType = e.target.value as AssetFormType;
                        return {
                          ...prev,
                          asset_type: assetType,
                          expiry_date: assetType === 'document' ? prev.expiry_date : '',
                        };
                      })
                    }
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="property">Property</option>
                    <option value="vehicle">Vehicle</option>
                    <option value="gadget">Gadget</option>
                    <option value="document">Document</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Asset Name</span>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Asset name"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Date</span>
                  <input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchase_date: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Price</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, purchase_price: e.target.value }))}
                    placeholder="Purchase price"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Current Value</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.current_value}
                    onChange={(e) => setFormData((prev) => ({ ...prev, current_value: e.target.value }))}
                    placeholder="Current value"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Location</span>
                  <input
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="Location (optional)"
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </label>

                {formData.asset_type === 'document' && (
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Expiry Date</span>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, expiry_date: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </label>
                )}
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Keep values and expiry details updated for better reminders and valuation tracking.</span>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg ai-gradient-button text-white disabled:opacity-60"
                  disabled={isSaving || !familyId}
                >
                  {isSaving ? 'Saving...' : editingAsset ? 'Update Asset' : 'Save Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
