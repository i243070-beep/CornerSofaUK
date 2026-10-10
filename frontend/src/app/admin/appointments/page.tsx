'use client';
import { readApiJson } from '@/lib/api-json';

import { useState, useEffect } from 'react';

interface Appointment {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  appointment_date: string;
  notes: string;
  status: string;
  showroom_id?: string;
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch('/api/appointment');
        if (res.ok) setAppointments(await readApiJson(res));
      } catch { /* fallback */ }
      setLoading(false);
    }
    fetchAppointments();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    try {
      await fetch(`/api/appointment/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      const res = await fetch('/api/appointment');
      if (res.ok) setAppointments(await readApiJson(res));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    try {
      await fetch(`/api/appointment/${id}`, { method: 'DELETE' });
    } catch {
      const res = await fetch('/api/appointment');
      if (res.ok) setAppointments(await readApiJson(res));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-[0.15em] uppercase text-white/90">Appointments</h1>
          <p className="text-xs text-white/30 mt-1">{appointments.length} total bookings</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-[#C5A880] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-white/30">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <p className="text-sm text-white/30">No appointments yet.</p>
          <p className="text-[10px] text-white/15 mt-2">Bookings will appear here when customers schedule showroom visits.</p>
        </div>
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Date & Time</th>
                <th>Showroom</th>
                <th>Notes</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td className="text-white/80 font-medium">{apt.customer_name}</td>
                  <td>
                    <p className="text-white/50 text-xs">{apt.email}</p>
                    {apt.phone && <p className="text-[10px] text-white/25">{apt.phone}</p>}
                  </td>
                  <td className="text-white/50">
                    {new Date(apt.appointment_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {' '}
                    {new Date(apt.appointment_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="text-white/40 capitalize">{apt.showroom_id || 'Manchester'}</td>
                  <td className="text-white/25 text-xs max-w-[150px] truncate">{apt.notes || '—'}</td>
                  <td>
                    <select value={apt.status} onChange={(e) => handleStatusChange(apt.id, e.target.value)}
                      className="admin-input py-1 px-2 text-[10px] rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(apt.id)} className="text-[10px] text-red-400 hover:underline uppercase tracking-widest">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
