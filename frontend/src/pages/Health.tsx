import { useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Plus, CalendarClock, Syringe, FileText, Pill } from 'lucide-react';

interface MedicalRecord {
  id: string;
  title: string;
  doctor: string;
  hospital: string;
  date: string;
}

interface Vaccination {
  id: string;
  name: string;
  dose: string;
  takenOn: string;
  nextDoseDate?: string;
}

interface Appointment {
  id: string;
  doctor: string;
  specialty: string;
  dateTime: string;
  location: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Prescription {
  id: string;
  medicine: string;
  dosage: string;
  duration: string;
  prescribedBy: string;
}

const toDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const toDateTime = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const daysTo = (value?: string) => {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export default function Health() {
  const [activeTab, setActiveTab] = useState('health');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [records] = useState<MedicalRecord[]>([
    { id: 'rec-1', title: 'General Checkup', doctor: 'Dr. Verma', hospital: 'Apollo Clinic', date: '2026-01-24' },
    { id: 'rec-2', title: 'Blood Test', doctor: 'Dr. Iyer', hospital: 'HealthLab', date: '2026-02-07' },
  ]);
  const [vaccinations] = useState<Vaccination[]>([
    { id: 'vac-1', name: 'Tetanus', dose: 'Booster', takenOn: '2024-07-10', nextDoseDate: '2026-07-10' },
    { id: 'vac-2', name: 'Flu Shot', dose: 'Annual', takenOn: '2025-10-03', nextDoseDate: '2026-10-03' },
  ]);
  const [appointments, setAppointments] = useState<Appointment[]>([
    { id: 'app-1', doctor: 'Dr. Neha Sharma', specialty: 'Dermatology', dateTime: '2026-03-03T10:30:00', location: 'City Care', status: 'scheduled' },
    { id: 'app-2', doctor: 'Dr. Amit Rao', specialty: 'Dentist', dateTime: '2026-03-15T17:00:00', location: 'Smile Dental', status: 'scheduled' },
  ]);
  const [prescriptions] = useState<Prescription[]>([
    { id: 'pre-1', medicine: 'Vitamin D3', dosage: '1 tablet daily', duration: '30 days', prescribedBy: 'Dr. Verma' },
    { id: 'pre-2', medicine: 'Cetirizine', dosage: '1 tablet at night', duration: '10 days', prescribedBy: 'Dr. Neha Sharma' },
  ]);

  const [formData, setFormData] = useState({
    doctor: '',
    specialty: '',
    dateTime: '',
    location: '',
  });

  const upcomingAppointments = useMemo(
    () => appointments.filter((a) => a.status === 'scheduled' && new Date(a.dateTime).getTime() >= Date.now()).length,
    [appointments]
  );
  const vaccineDueSoon = useMemo(
    () => vaccinations.filter((v) => (daysTo(v.nextDoseDate) ?? 9999) <= 45 && (daysTo(v.nextDoseDate) ?? -1) >= 0).length,
    [vaccinations]
  );

  const handleAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctor || !formData.specialty || !formData.dateTime) return;

    setAppointments((prev) => [
      ...prev,
      {
        id: `app-${Date.now()}`,
        doctor: formData.doctor,
        specialty: formData.specialty,
        dateTime: formData.dateTime,
        location: formData.location || 'Not specified',
        status: 'scheduled',
      },
    ]);

    setShowModal(false);
    setFormData({ doctor: '', specialty: '', dateTime: '', location: '' });
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Health</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Medical records, vaccinations, appointments and prescriptions</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex h-11 items-center gap-2 ai-gradient-button text-white px-4 rounded-lg text-sm font-medium whitespace-nowrap"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Add Appointment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Appointments</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{upcomingAppointments}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Vaccines Due Soon</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">{vaccineDueSoon}</p>
              </div>
              <div className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Prescriptions</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">{prescriptions.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Medical Records</h3>
                </div>
                <div className="space-y-0">
                  {records.map((r) => (
                    <article key={r.id} className="px-3 py-2.5 border-b border-[var(--panel-border)] last:border-b-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{r.title}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{r.doctor} • {r.hospital} • {toDate(r.date)}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Syringe className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Vaccinations</h3>
                </div>
                <div className="space-y-0">
                  {vaccinations.map((v) => (
                    <article key={v.id} className="px-3 py-2.5 border-b border-[var(--panel-border)] last:border-b-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{v.name} ({v.dose})</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Taken: {toDate(v.takenOn)} • Next: {toDate(v.nextDoseDate)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarClock className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Appointments</h3>
                </div>
                <div className="space-y-0">
                  {appointments.map((a) => (
                    <article key={a.id} className="px-3 py-2.5 border-b border-[var(--panel-border)] last:border-b-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{a.doctor}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {a.specialty} • {toDateTime(a.dateTime)} • {a.location}
                      </p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl shadow-sm border border-[var(--panel-border)] glass-black-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Pill className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Prescriptions</h3>
                </div>
                <div className="space-y-0">
                  {prescriptions.map((p) => (
                    <article key={p.id} className="px-3 py-2.5 border-b border-[var(--panel-border)] last:border-b-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{p.medicine}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{p.dosage} • {p.duration} • {p.prescribedBy}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--panel-border)] shadow-xl glass-black-surface">
            <form onSubmit={handleAddAppointment} className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Add Appointment</h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={formData.doctor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, doctor: e.target.value }))}
                  placeholder="Doctor name"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  value={formData.specialty}
                  onChange={(e) => setFormData((prev) => ({ ...prev, specialty: e.target.value }))}
                  placeholder="Specialty"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dateTime: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <input
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Location"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 text-xs text-indigo-700 dark:text-indigo-300">
                Appointment reminders can be configured before visit time.
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
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
