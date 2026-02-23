import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { householdAPI, Household } from '@/lib/api';
import { ArrowLeft, UserPlus, Users, Shield, Eye, Menu, Bell, Flame } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

interface Member {
  id: string;
  user_id: string | null;
  household_id: string;
  role: string;
  status: string;
  invitation_email: string | null;
  invitation_sent_at: string | null;
  joined_at: string;
  user_email: string | null;
  full_name: string | null;
}

export default function FamilyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('family');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('viewer');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ fname: '', lname: '', phone: '', email: '', relation: '' });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadHousehold();
      loadMembers();
    }
  }, [id]);

  const loadHousehold = async () => {
    try {
      const data = await householdAPI.get(id!);
      setHousehold(data);
    } catch (error) {
      console.error('Failed to load household', error);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await householdAPI.listMembers(id!);
      setMembers(data);
      const currentMember = data.find((m: Member) => m.user_id === user?.id);
      if (currentMember) setCurrentUserRole(currentMember.role);
    } catch (error) {
      console.error('Failed to load members', error);
    }
  };

  const updateAddress = async (address: string) => {
    try {
      await householdAPI.updateAddress(id!, address);
    } catch (error) {
      console.error('Failed to update address', error);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await householdAPI.addMember(id!, formData);
      setShowModal(false);
      setFormData({ fname: '', lname: '', phone: '', email: '', relation: '' });
      loadMembers();
    } catch (error) {
      console.error('Failed to invite member', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <Shield className="w-4 h-4 text-indigo-600" />;
    return <Eye className="w-4 h-4 text-gray-500" />;
  };

  const getRoleBadge = (role: string, status: string) => {
    if (status === 'pending') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">Pending</span>;
    }
    if (role === 'admin') {
      return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">Admin</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">Viewer</span>;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'family') navigate('/');
        }}
        mobileOpen={mobileMenuOpen}
        onMobileToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 h-[73px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-gray-800 text-lg">
                Good morning, {user?.full_name || 'User'} 👋
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-sm font-bold">
              <Flame className="w-4 h-4" />
              <span>0-day streak</span>
            </div>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100 relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 md:px-8 py-6 overflow-y-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">Family</h2>
                {currentUserRole === 'admin' ? (
                  <input
                    type="text"
                    value={household?.address || ''}
                    onChange={(e) => setHousehold(household ? { ...household, address: e.target.value } : null)}
                    onBlur={() => household && updateAddress(household.address || '')}
                    placeholder="Enter address"
                    className="text-gray-600 mt-1 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 -ml-1 w-full"
                  />
                ) : (
                  <p className="text-gray-600 mt-1">{household?.address || 'No address'}</p>
                )}
              </div>
              {currentUserRole === 'admin' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 font-medium"
                >
                  <UserPlus className="w-5 h-5" />
                  Invite Member
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Family Members ({members.length})
              </h3>

              <div className="space-y-3">
                {members.map((member) => {
                  const displayName = member.status === 'pending'
                    ? member.invitation_email
                    : member.full_name;
                  const displayEmail = member.status === 'pending'
                    ? 'Invitation sent'
                    : member.user_email;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{displayName}</p>
                          <p className="text-sm text-gray-500">{displayEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {member.status === 'active' && getRoleIcon(member.role)}
                        {getRoleBadge(member.role, member.status)}
                      </div>
                    </div>
                  );
                })}

                {members.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No members yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Invite Family Member</h2>
            <p className="text-sm text-gray-600 mb-4">
              Invited members will have read-only access to household data.
            </p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  value={formData.fname}
                  onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={formData.lname}
                  onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value="+91"
                    disabled
                    className="w-16 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
                <select
                  value={formData.relation}
                  onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Select relation</option>
                  <option value="spouse">Spouse</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="son">Son</option>
                  <option value="daughter">Daughter</option>
                  <option value="brother">Brother</option>
                  <option value="sister">Sister</option>
                  <option value="grandfather">Grandfather</option>
                  <option value="grandmother">Grandmother</option>
                  <option value="uncle">Uncle</option>
                  <option value="aunt">Aunt</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="member@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
