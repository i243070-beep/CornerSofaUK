'use client';
import { readApiJson } from '@/lib/api-json';

import { useState } from 'react';
import { Button, Input, Card } from '@/components/ui';
import { generateLocalBusinessSchema } from '@/lib/schema';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const SHOWROOMS = [
  {
    id: 'manchester',
    name: 'Manchester Showroom',
    address: '42 Deansgate, Manchester M3 1NH',
    hours: 'Mon–Sat 9am–6pm · Sun 10am–4pm',
  },
  {
    id: 'london',
    name: 'London Showroom',
    address: '118 Tottenham Court Rd, London W1T 5HP',
    hours: 'Mon–Sat 9am–6pm · Sun 10am–4pm',
  },
];

function formatTime(time: string) {
  const [h, m] = time.split(':');
  const hour = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'pm' : 'am'}`;
}

export default function AppointmentPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    showroom: 'manchester',
    date: '',
    time: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const selectedShowroom = SHOWROOMS.find((s) => s.id === form.showroom)!;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.date) e.date = 'Please select a date';
    if (!form.time) e.time = 'Please select a time slot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    const dateTime = `${form.date}T${form.time}:00`;

    try {
      const res = await fetch('/api/appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          email: form.email,
          phone: form.phone,
          appointmentDate: dateTime,
          showroomId: form.showroom,
          notes: form.notes,
        }),
      });

      const data = await readApiJson(res);
      if (!res.ok) throw new Error(data.error || 'Booking failed');

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const dateObj = new Date(`${form.date}T${form.time}`);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return (
      <main className="py-20 bg-primary">
        <div className="max-w-lg mx-auto px-4 text-center">
          <Card className="p-10">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-light tracking-[0.15em] text-dark uppercase mb-3">
              Appointment Booked
            </h1>
            <p className="text-sm text-dark/60 mb-6">
              We look forward to welcoming you to our showroom.
            </p>
            <div className="bg-primary/50 rounded-lg p-4 mb-6 text-left space-y-2">
              <p className="text-xs text-dark/50 uppercase tracking-widest">Details</p>
              <p className="text-sm text-dark">{formattedDate} at {formatTime(form.time)}</p>
              <p className="text-sm text-dark">{selectedShowroom.name}</p>
              <p className="text-xs text-dark/50">{selectedShowroom.address}</p>
            </div>
            <p className="text-xs text-dark/40 mb-6">
              A confirmation email has been sent to {form.email}.
            </p>
            <Button variant="contrast" size="lg" onClick={() => { setSuccess(false); setForm({ name: '', email: '', phone: '', showroom: 'manchester', date: '', time: '', notes: '' }); }}>
              Book Another
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="py-20 bg-primary">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(generateLocalBusinessSchema()) }}
      />
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-light tracking-[0.2em] text-dark uppercase mb-3">
            Visit Our Showroom
          </h1>
          <p className="text-sm tracking-widest text-dark/60 uppercase">
            Experience our sofas in person before you decide
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar — Showroom Info */}
          <div className="lg:col-span-1 space-y-4">
            {SHOWROOMS.map((showroom) => (
              <div
                key={showroom.id}
                className={`bg-white rounded-xl border p-5 cursor-pointer transition-all duration-200 ${
                  form.showroom === showroom.id
                    ? 'border-accent shadow-md'
                    : 'border-gray-200 hover:border-dark/20'
                }`}
                onClick={() => setForm({ ...form, showroom: showroom.id })}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                    form.showroom === showroom.id ? 'bg-accent' : 'bg-gray-300'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-dark">{showroom.name}</p>
                    <p className="text-xs text-dark/50 mt-1">{showroom.address}</p>
                    <p className="text-xs text-dark/40 mt-1">{showroom.hours}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-medium tracking-[0.15em] uppercase text-dark/60 mb-3">
                What to Expect
              </h3>
              <ul className="space-y-2 text-xs text-dark/50">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Personal consultation with a sofa specialist
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Touch and feel all fabric and leather options
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  Customisation advice for your space
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  No obligation — just expert guidance
                </li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="p-8">
              <h2 className="text-lg font-light tracking-[0.15em] text-dark uppercase mb-6">
                Book Your Visit
              </h2>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Input
                    label="Full Name"
                    required
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    error={errors.name}
                  />
                  <Input
                    label="Email"
                    type="email"
                    required
                    placeholder="john@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    error={errors.email}
                  />
                </div>

                <Input
                  label="Phone (optional)"
                  type="tel"
                  placeholder="07700 900000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-dark/70 mb-1.5 uppercase tracking-wider">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className={`w-full px-4 py-3 rounded-lg border text-sm text-dark bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors ${
                        errors.date ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-dark/70 mb-1.5 uppercase tracking-wider">
                      Preferred Time
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setForm({ ...form, time: slot })}
                          className={`py-2 px-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                            form.time === slot
                              ? 'bg-accent text-primary'
                              : 'bg-gray-100 text-dark hover:bg-gray-200'
                          }`}
                        >
                          {formatTime(slot)}
                        </button>
                      ))}
                    </div>
                    {errors.time && <p className="text-xs text-red-500 mt-1">{errors.time}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-dark/70 mb-1.5 uppercase tracking-wider">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us about your space, style preferences, or any questions..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 text-sm text-dark bg-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="contrast"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  Confirm Booking
                </Button>
                <p className="text-xs text-center text-dark/40">
                  Free parking available at all showrooms
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
