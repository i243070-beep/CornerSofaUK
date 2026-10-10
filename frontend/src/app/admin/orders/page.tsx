'use client';
import { readApiJson } from '@/lib/api-json';
import BuildSpecification from '@/components/sofa-builder/BuildSpecification';
import type { BuildSnapshot } from '@/lib/sofa-builder/types';

import { Fragment, useState, useEffect } from 'react';
import OrderReference from '@/components/OrderReference';

interface Order {
  id: string;
  customer: string;
  email: string;
  phone?: string;
  address?: string;
  postcode?: string;
  city?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  subtotal?: number;
  deliveryOption?: string;
  deliveryCost?: number;
  assemblyCost?: number;
  deliveryPreference?: 'asap' | 'date';
  requestedDeliveryDate?: string;
  deliveryInstructions?: string;
  removeOldSofa?: boolean;
  removalCost?: number;

  total: number;
  items: number;
  status: string;
  date: string;
  deliveryDate?: string;
  deliveryTime?: string;
  assemblyFloor?: 'ground' | 'first';
  sofaDetails?: string;
  emailSentAt?: string;
  lines?: Array<{ buildSnapshot?: BuildSnapshot; title: string; color: string; quantity: number; price: number; type?: string; range_type?: string; productId?: string; variantId?: string }>;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'admin-badge-amber',
  processing: 'admin-badge-blue',
  shipped: 'admin-badge-blue',
  delivered: 'admin-badge-green',
  cancelled: 'admin-badge-red',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [sofaDetails, setSofaDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [deliveryError, setDeliveryError] = useState('');

  useEffect(() => {
    let active = true;
    let controller = new AbortController();
    async function refresh() {
      controller.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await fetch('/api/orders', { cache: 'no-store', signal });
        if (!response.ok) throw new Error('Could not load orders. Please refresh or sign in again.');
        const data = await readApiJson(response);
        if (active && !signal.aborted) { setOrders(Array.isArray(data) ? data : []); setLoadError(''); }
      } catch (error) {
        if (active && !signal.aborted) setLoadError(error instanceof Error ? error.message : 'Could not load orders.');
      } finally { if (active && !signal.aborted) setLoading(false); }
    }
    void refresh();
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('corner-sofa-orders') : null;
    channel?.addEventListener('message', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; controller.abort(); channel?.close(); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, [reloadKey]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    const previous = orders;
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o));
    const response = await fetch(`/api/orders/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) setOrders(previous);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  const editDelivery = (order: Order) => { setEditingId(order.id); setDeliveryDate(order.deliveryDate || ''); setDeliveryTime(order.deliveryTime || ''); setSofaDetails(order.sofaDetails || order.lines?.filter((line) => line.type !== 'swatch').map((line) => `${line.title} — ${line.color} × ${line.quantity}`).join('\n') || ''); setDeliveryError(''); };
  const saveDelivery = async (sendEmail: boolean, approve = false) => {
    if (!editingId) return;
    if (approve && (!deliveryDate || !deliveryTime.trim())) { setDeliveryError('Add a delivery date and time before approving this order.'); return; }
    setSaving(true);
    setDeliveryError('');
    try {
      const response = await fetch(`/api/orders/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deliveryDate, deliveryTime, sofaDetails, sendEmail, approve }) });
      const data = await readApiJson(response).catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save delivery details.');
      setOrders((current) => current.map((order) => order.id === editingId ? data.order : order));
      if (sendEmail) alert('Delivery details saved and email sent.');
      if (approve) setEditingId(null);
    } catch (failure) { setDeliveryError(failure instanceof Error ? failure.message : 'Could not save delivery details.'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-[0.15em] uppercase text-white/90">Orders</h1>
          <p className="text-xs text-white/30 mt-1">{orders.length} orders · £{totalRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })} order value</p>
        </div>
        <div className="admin-card px-4 py-2">
          <span className="text-[10px] text-white/30">Pending: </span>
          <span className="text-[10px] text-[#C5A880] font-medium">{pendingCount}</span>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-4"><button type="button" onClick={() => setReloadKey(key => key + 1)} className="text-xs underline underline-offset-4">Refresh orders</button><span className="text-xs text-white/40">New orders refresh automatically.</span></div>
      {loadError && <p role="alert" className="mb-5 rounded-xl border border-red-300/30 bg-red-500/10 p-4 text-sm">{loadError}</p>}
      {loading ? (
        <div className="admin-card p-12 text-center">
          <div className="w-6 h-6 border-2 border-[#C5A880] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-white/30">Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="admin-card p-12 text-center">
          <p className="text-sm text-white/30">No orders yet.</p>
        </div>
      ) : (
        <div className="admin-table">
          <table className="w-full">
            <thead>
                <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                  <th>Status</th>
                  <th>Delivery</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <Fragment key={order.id}><tr>
                  <td className="text-white/80 font-medium"><OrderReference id={order.id} /><p className="mt-2 text-[10px] font-normal">{order.paymentMethod || 'Payment method not recorded'}{order.paymentStatus === 'unpaid' ? ' · Due on delivery' : ''}</p></td>
                  <td>
                    <p className="text-white/70">{order.customer}</p>
                    <p className="text-[10px] text-white/25">{order.email}</p>
                    {order.phone && <p className="text-[10px] text-white/25">{order.phone}</p>}
                  </td>
                  <td className="text-white/40">{new Date(order.date).toLocaleDateString('en-GB')}</td>
                  <td className="text-white/40">{order.items}</td>
                  <td className="text-white/70">£{order.total.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <select value={order.status} onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="admin-input py-1 px-2 text-[10px] rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="confirmed" disabled>Approved</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td><button type="button" onClick={() => editDelivery(order)} className="text-[10px] text-[#C5A880] hover:underline">{order.deliveryDate ? 'Edit delivery' : 'Approve & schedule'}</button>{order.deliveryDate && <span className="mt-1 block text-[9px] text-emerald-300">{order.deliveryDate} · {order.deliveryTime}</span>}{order.emailSentAt && <span className="mt-1 block text-[9px] text-emerald-300">Email sent</span>}</td>
                </tr>
                <tr><td colSpan={7}><details className="rounded-xl border border-white/10 p-4"><summary className="cursor-pointer text-xs font-medium">View sofas & delivery address</summary><div className="grid gap-6 pt-4 md:grid-cols-2"><div><h3 className="text-xs font-semibold mb-2">Delivery & contact</h3><p className="text-xs leading-6">{order.customer}<br />{order.address || 'Address not recorded'}{order.city && <><br />{order.city}</>}<br />{order.postcode}<br />{order.phone}<br />{order.email}</p><p className="text-xs mt-3">{order.deliveryOption || 'Delivery to be arranged'} · {order.assemblyFloor === 'first' ? 'First floor assembly' : 'Ground floor assembly'}</p><p className="text-xs mt-2">Requested delivery: {order.requestedDeliveryDate || "As soon as possible"}</p><p className="text-xs mt-2">Old-sofa removal: {order.removeOldSofa ? `Yes - GBP ${(order.removalCost || 0).toFixed(2)}` : "No"}</p>{order.deliveryInstructions && <p className="text-xs mt-2 whitespace-pre-wrap">Delivery instructions: {order.deliveryInstructions}</p>}{order.deliveryDate && <p className="text-xs mt-2 text-emerald-300">Scheduled: {order.deliveryDate} · {order.deliveryTime}</p>}</div><div><h3 className="text-xs font-semibold mb-2">Ordered items</h3>{order.lines?.map((line, index) => <div key={index} className="border-b border-white/10 py-2 text-xs"><strong>{line.title}</strong>{line.buildSnapshot && <BuildSpecification build={line.buildSnapshot} compact />}<p className="mt-1">{line.range_type ? `${line.range_type} · ` : ''}{line.color} · Quantity {line.quantity}</p><p className="mt-1">£{line.price.toFixed(2)} each · £{(line.price * line.quantity).toFixed(2)}</p></div>)}{order.subtotal !== undefined && <p className="text-xs mt-3">Subtotal: £{order.subtotal.toFixed(2)}</p>}{order.deliveryCost !== undefined && <p className="text-xs mt-2">Delivery: £{order.deliveryCost.toFixed(2)}</p>}{order.assemblyCost !== undefined && <p className="text-xs mt-2">{order.assemblyFloor === 'first' ? 'First-floor assembly' : 'Ground-floor assembly'}: £{order.assemblyCost.toFixed(2)}</p>}<p className="text-xs mt-3 font-semibold">{order.paymentStatus === 'unpaid' ? 'Due on delivery' : 'Order total'}: £{order.total.toFixed(2)}</p></div></div></details></td></tr>
                {editingId === order.id && <tr><td colSpan={7}><div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[180px_220px_1fr_auto] md:items-end"><label className="text-[10px] uppercase tracking-widest text-white/45">Delivery date<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="admin-input mt-2 w-full text-xs" /></label><label className="text-[10px] uppercase tracking-widest text-white/45">Delivery time<input type="text" value={deliveryTime} onChange={(event) => setDeliveryTime(event.target.value)} className="admin-input mt-2 w-full text-xs" placeholder="e.g. 10:00–14:00" maxLength={40} /></label><label className="text-[10px] uppercase tracking-widest text-white/45">Sofa details<textarea value={sofaDetails} onChange={(event) => setSofaDetails(event.target.value)} className="admin-input mt-2 min-h-16 w-full resize-y text-xs" placeholder="3-seater, charcoal velvet, left-facing chaise" /></label><div className="flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => saveDelivery(false)} className="rounded-lg bg-[#65745d] px-3 py-2 text-[10px] text-white disabled:opacity-50">Save details</button><button type="button" disabled={saving || !deliveryDate || !deliveryTime.trim()} onClick={() => saveDelivery(false, true)} className="rounded-lg bg-[#C5A880] px-3 py-2 text-[10px] text-slate-950 disabled:opacity-50">Approve & publish date</button><button type="button" disabled={saving} onClick={() => saveDelivery(true)} className="rounded-lg border border-white/15 px-3 py-2 text-[10px] text-white disabled:opacity-50">Save & email</button></div>{deliveryError && <p role="alert" className="text-xs text-red-300 md:col-span-4">{deliveryError}</p>}</div></td></tr>}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10px] text-white/15 mt-4">Confirmed checkout orders appear here automatically. Update their fulfilment status using the menu above.</p>
    </div>
  );
}
