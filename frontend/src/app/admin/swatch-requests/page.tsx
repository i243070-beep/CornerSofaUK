'use client';
import { readApiJson } from '@/lib/api-json';

import { useState, useEffect } from 'react';

interface SwatchRequest {
  id: string;
  customer_name: string;
  email: string;
  shipping_address: { line1: string; line2?: string; city: string; postcode: string };
  swatch_ids: string[];
  created_at: string;
  status?: string;
}

interface Swatch {
  id: string;
  name: string;
  material: string;
}

export default function AdminSwatchRequestsPage() {
  const [requests, setRequests] = useState<SwatchRequest[]>([]);
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        const res = await fetch('/api/swatch-request');
        if (res.ok) setRequests(await readApiJson(res));
        const swatchRes = await fetch('/api/swatches');
        if (swatchRes.ok) setSwatches(await readApiJson(swatchRes));
      } catch { /* fallback */ }
      setLoading(false);
    }
    fetchRequests();
  }, []);

  const swatchNames = (ids: string[]) => ids?.map((id) => {
    const swatch = swatches.find((item) => item.id === id);
    return swatch ? `${swatch.name} (${swatch.material})` : id;
  }).join(', ');

  const handleStatusChange = async (id: string, newStatus: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
    try {
      await fetch(`/api/swatch-request/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      const res = await fetch('/api/swatch-request');
      if (res.ok) setRequests(await readApiJson(res));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this swatch request?')) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    try {
      await fetch(`/api/swatch-request/${id}`, { method: 'DELETE' });
    } catch {
      const res = await fetch('/api/swatch-request');
      if (res.ok) setRequests(await readApiJson(res));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-[0.15em] uppercase text-white/90">Swatch Requests</h1>
          <p className="text-xs text-white/30 mt-1">{requests.length} total requests</p>
        </div>
      </div>

      {loading ? (
        <div className="admin-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-[#C5A880] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-white/30">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <p className="text-sm text-white/30">No swatch requests yet.</p>
          <p className="text-[10px] text-white/15 mt-2">Requests will appear here when customers submit the swatch form.</p>
        </div>
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Address</th>
                <th>Swatches</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id}>
                  <td className="text-white/80 font-medium">{req.customer_name}</td>
                  <td className="text-white/50">{req.email}</td>
                  <td>
                    <p className="text-white/40 text-xs">{req.shipping_address?.line1}</p>
                    <p className="text-[10px] text-white/20">{req.shipping_address?.city}, {req.shipping_address?.postcode}</p>
                  </td>
                  <td className="max-w-xs text-white/40 text-xs">{swatchNames(req.swatch_ids) || `${req.swatch_ids?.length || 0} selected`}</td>
                  <td className="text-white/40">{new Date(req.created_at).toLocaleDateString('en-GB')}</td>
                  <td>
                    <select value={req.status || 'pending'} onChange={(e) => handleStatusChange(req.id, e.target.value)}
                      className="admin-input py-1 px-2 text-[10px] rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(req.id)} className="text-[10px] text-red-400 hover:underline uppercase tracking-widest">Delete</button>
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
