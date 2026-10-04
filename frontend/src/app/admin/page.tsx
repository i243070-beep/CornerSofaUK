'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Armchair, CalendarDays, Check, ChevronDown, CircleAlert, Clock3, Layers, Package, RefreshCw, Search, Sparkles } from 'lucide-react';
import styles from './dashboard.module.css';

interface Stats {
  products: number; swatchRequests: number; appointments: number; orders: number;
  pendingAppointments: number; pendingSwatches: number;
}
interface Product {
  id: string; title: string; category: string; images?: string[];
}
interface Order { id: string; customer: string; total: number; status: string; date: string }
interface Appointment { id: string; customer_name: string; appointment_date: string; created_at?: string; status: string }
interface Swatch { id: string; customer_name: string; created_at: string; status?: string; swatch_ids?: string[] }
type Range = 'year' | 'month' | 'week';
type WorkType = 'orders' | 'appointments' | 'swatches';
interface WorkItem { id: string; type: WorkType; title: string; description: string; label: string; href: string; date?: string; image?: string; detail: string }
interface DashboardData { stats: Stats | null; products: Product[] | null; orders: Order[] | null; appointments: Appointment[] | null; swatches: Swatch[] | null }
const emptyData: DashboardData = { stats: null, products: null, orders: null, appointments: null, swatches: null };
const categories = [
  { name: 'Corner sofas', category: 'Corner', className: styles.pinkBar },
  { name: '2-seater sofas', category: '2-Seater', className: styles.whiteBar },
  { name: '3-seater sofas', category: '3-Seater', className: styles.greyBar },
  { name: 'Recliners', category: 'Recliner', className: styles.stripedBar },
];
const actions = [
  { title: 'Manage products', href: '/admin/products', icon: Armchair, tone: 'yellow' },
  { title: 'View orders', href: '/admin/orders', icon: Package, tone: 'pink' },
  { title: 'Fabric requests', href: '/admin/swatch-requests', icon: Layers, tone: 'blue' },
  { title: 'Appointments', href: '/admin/appointments', icon: CalendarDays, tone: 'purple' },
];
const workLabels: Record<WorkType, string> = { orders: 'Orders', appointments: 'Appointments', swatches: 'Swatch requests' };
const workIcons = { orders: Package, appointments: CalendarDays, swatches: Layers };
const number = (value?: number) => value === undefined ? '—' : value.toLocaleString('en-GB');
const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);

function createPoints(data: DashboardData, range: Range, now: Date) {
  const count = range === 'year' ? 12 : range === 'month' ? 30 : 7;
  const points = Array.from({ length: count }, (_, index) => {
    const date = range === 'year'
      ? new Date(now.getFullYear(), now.getMonth() - count + 1 + index, 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - count + 1 + index);
    const end = range === 'year' ? new Date(date.getFullYear(), date.getMonth() + 1, 1) : new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return {
      label: date.toLocaleDateString('en-GB', range === 'year' ? { month: 'short' } : { day: 'numeric', month: 'short' }),
      fullLabel: date.toLocaleDateString('en-GB', range === 'year' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }),
      start: date.getTime(), end: end.getTime(), orders: 0, appointments: 0, swatches: 0,
    };
  });
  const add = (date: string | undefined, key: 'orders' | 'appointments' | 'swatches') => {
    if (!date) return;
    const timestamp = new Date(date).getTime();
    const point = points.find((entry) => timestamp >= entry.start && timestamp < entry.end);
    if (point) point[key]++;
  };
  data.orders?.forEach((order) => add(order.date, 'orders'));
  data.appointments?.forEach((appointment) => add(appointment.created_at, 'appointments'));
  data.swatches?.forEach((swatch) => add(swatch.created_at, 'swatches'));
  return points;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [range, setRange] = useState<Range>('month');
  const [workType, setWorkType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [actionQuery, setActionQuery] = useState('');
  const requestRef = useRef<AbortController | null>(null);

  const loadDashboard = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    const read = async (url: string, array = true) => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Data unavailable');
      const result = await response.json();
      if (array ? !Array.isArray(result) : !result || typeof result !== 'object' || typeof result.products !== 'number') throw new Error('Invalid response');
      return result;
    };
    const results = await Promise.allSettled([
      read('/api/admin/stats/', false), read('/api/products/'), read('/api/orders/'),
      read('/api/appointment/'), read('/api/swatch-request/'),
    ]);
    if (controller.signal.aborted) return;
    const value = (index: number) => results[index].status === 'fulfilled' ? results[index].value : null;
    setData({ stats: value(0), products: value(1), orders: value(2), appointments: value(3), swatches: value(4) });
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
    const refresh = () => { loadDashboard(); };
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('corner-sofa-products') : null;
    channel?.addEventListener('message', refresh);
    return () => { requestRef.current?.abort(); channel?.close(); };
  }, [loadDashboard]);

  const stats = data.stats;
  const points = useMemo(() => createPoints(data, range, updatedAt || new Date()), [data, range, updatedAt]);
  const inventoryAvailable = data.products !== null;
  const workItems = useMemo(() => {
    const result: WorkItem[] = [];
    data.orders?.forEach((order) => {
      if (!['cancelled', 'delivered'].includes(order.status)) result.push({
        id: 'order-' + order.id, type: 'orders', title: order.customer, label: order.status || 'Order',
        description: 'An order is ready for its next step. Review the details and update fulfilment.',
        href: '/admin/orders', date: order.date, detail: money(Number(order.total)) + ' · ' + order.id,
      });
    });
    data.appointments?.filter((appointment) => appointment.status === 'pending').forEach((appointment) => result.push({
      id: 'appointment-' + appointment.id, type: 'appointments', title: appointment.customer_name, label: 'Appointment',
      description: 'A showroom visit is awaiting confirmation.', href: '/admin/appointments',
      date: appointment.created_at, detail: new Date(appointment.appointment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    }));
    data.swatches?.filter((swatch) => !['shipped', 'completed', 'cancelled'].includes(swatch.status || '')).forEach((swatch) => result.push({
      id: 'swatch-' + swatch.id, type: 'swatches', title: swatch.customer_name, label: 'Fabric request',
      description: 'Review a customer’s fabric selection and request details.', href: '/admin/swatch-requests',
      date: swatch.created_at, detail: (swatch.swatch_ids?.length || 0) + ' fabric samples',
    }));
    return result;
  }, [data]);
  const visibleWork = workItems.filter((item) => workType === 'all' || item.type === workType).sort((a, b) => {
    const diff = (a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0);
    return sort === 'newest' ? -diff : diff;
  }).slice(0, 2);
  const unavailable = Object.entries(data).filter(([, value]) => value === null).map(([key]) => ({ stats: 'overview', products: 'products', orders: 'orders', appointments: 'appointments', swatches: 'swatches' }[key])).join(', ');
  const filteredActions = actions.filter((action) => action.title.toLowerCase().includes(actionQuery.toLowerCase().trim()));

  return (
    <div className={styles.dashboard}>
      <div className={styles.headingRow}>
        <div><div className={styles.kicker}><span /> Your store, at a glance</div><h1>Welcome back, <span>Admin</span></h1><p>Good things are taking shape. Here’s your store today.</p></div>
        <div className={styles.headingTools}><Link href="/admin/orders" className="rounded-full border border-[#65745d] bg-[#65745d] px-4 py-2.5 text-[11px] font-medium text-white transition-colors hover:bg-[#78896e]">Delivery &amp; email</Link><span className={styles.datePill}><CalendarDays size={14} aria-hidden="true" />{updatedAt?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) || 'Today'}</span><button type="button" onClick={loadDashboard} disabled={loading} className={styles.refreshButton} aria-label="Refresh dashboard"><RefreshCw size={16} className={loading ? styles.spinning : ''} aria-hidden="true" /></button></div>
      </div>

      <div className={styles.overviewRow}>
        <div className={styles.categoryOverview} aria-label="Product category distribution">
          {categories.map((category) => {
            const count = data.products?.filter((product) => product.category === category.category).length || 0;
            const percent = data.products?.length ? Math.round(count / data.products.length * 100) : 0;
            return <div className={styles.categoryStat} key={category.category}><p>{category.name}</p><div className={category.className} title={inventoryAvailable ? count + ' products' : 'Unavailable'}>{loading || !inventoryAvailable ? '—' : percent + '%'}<span className={styles.srOnly}> of the catalogue</span></div></div>;
          })}
        </div>
        <div className={styles.metrics}>
          {[{ title: 'Total sofas', value: stats?.products, href: '/admin/products', icon: Armchair, className: styles.greenMetric }, { title: 'Total orders', value: stats?.orders, href: '/admin/orders', icon: Package, className: styles.greenMetric }].map(({ icon: Icon, ...metric }) => <Link key={metric.title} href={metric.href} className={styles.metric}><div><span className={metric.className}><Icon size={13} aria-hidden="true" /></span><strong>{loading ? '—' : number(metric.value)}</strong></div><p>{metric.title}</p></Link>)}
        </div>
      </div>

      {!loading && unavailable && <div className={styles.dataNotice} role="status"><CircleAlert size={15} aria-hidden="true" /><span>Some data couldn’t be loaded: {unavailable}.</span><button onClick={loadDashboard}>Try again</button></div>}

      <div className={styles.topGrid}>
        <section className={styles.activityPanel} aria-label="Store overview and activity">
          <div className={styles.summary}>
            <h2>Summary</h2>
            <div className={styles.summaryItems}>
              {[{ title: 'Orders', count: stats?.orders, className: styles.blueDot, href: '/admin/orders' }, { title: 'Appointments', count: stats?.appointments, className: styles.greenDot, href: '/admin/appointments' }, { title: 'Swatch requests', count: stats?.swatchRequests, className: styles.pinkDot, href: '/admin/swatch-requests' }].map((item) => <Link key={item.title} href={item.href} className={styles.summaryItem}><span className={item.className} /><span>{item.title}</span><strong>{loading ? '—' : number(item.count)}</strong></Link>)}
            </div>
            <div className={styles.summaryNote}><Sparkles size={17} aria-hidden="true" /><p>{stats ? <><strong>{stats.products} products.</strong> A whole lot of comfort.<br />Keep the details looking their best.</> : <>A little clarity for your everyday.<br />Your latest store totals live here.</>}</p></div>
          </div>
        </section>

      <div className={styles.bottomGrid}>
        <section className={styles.workPanel} aria-labelledby="work-heading">
          <div className={styles.cardHeading}><h2 id="work-heading">On your radar <span className={styles.countPill}>{loading ? '—' : workItems.length}</span></h2><div className={styles.workFilters}><label><span className={styles.srOnly}>Sort activity</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option></select><ChevronDown size={12} aria-hidden="true" /></label><label><span className={styles.srOnly}>Filter activity</span><select value={workType} onChange={(event) => setWorkType(event.target.value)}><option value="all">All</option>{Object.entries(workLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={12} aria-hidden="true" /></label></div></div>
          <div className={styles.workCards} aria-live="polite">
            {loading ? <div className={styles.emptyWork}><RefreshCw size={22} className={styles.spinning} /><p>Bringing your store into focus…</p></div> : visibleWork.length ? visibleWork.map((item) => {
              const Icon = workIcons[item.type];
              return <Link className={styles.workCard} href={item.href} key={item.id}><div className={styles.workCardTop}><span className={styles.workBadgeBlue}>{item.label}</span><ArrowUpRight size={15} aria-hidden="true" /></div><p className={styles.workDescription}>{item.description}</p><div className={styles.workCardBottom}>{item.image ? <img src={item.image} alt="" width={34} height={34} loading="lazy" className={styles.workImage} /> : <span className={styles.workAvatar}><Icon size={17} aria-hidden="true" /></span>}<div><h3>{item.title}</h3><p>{item.detail}</p></div></div></Link>;
            }) : <div className={styles.emptyWork}>{unavailable ? <CircleAlert size={25} aria-hidden="true" /> : <Check size={25} aria-hidden="true" />}<p>{unavailable ? 'Activity is unavailable for some sources.' : 'You’re all caught up.'}</p><span>{workType !== 'all' ? 'Try a different activity filter.' : 'New orders, requests and appointments appear here.'}</span></div>}
          </div>
        </section>

      </div>
      </div>
      <div className={styles.dashboardFooter}><span><span className={unavailable && !loading ? styles.pinkDot : styles.greenDot} />{loading ? 'Updating your overview…' : unavailable ? 'Some sources are unavailable.' : 'Your store, connected.'}</span><Link href="/admin/orders" className="text-[#c5a880] hover:underline">Open delivery &amp; email controls</Link><span><Clock3 size={12} aria-hidden="true" />{updatedAt ? 'Updated ' + updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Preparing your workspace'}</span></div>
    </div>
  );
}
