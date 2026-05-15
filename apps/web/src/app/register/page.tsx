'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Check } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import toast from 'react-hot-toast';

const PERKS = [
  'Free shipping on orders over ৳1,000',
  'Earn loyalty points on every purchase',
  'Exclusive member-only sales & early access',
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/register', { ...form, role: 'CUSTOMER' }).then(r => r.data.data),
    onSuccess: (data) => {
      if (data.accessToken) {
        localStorage.setItem('web_token', data.accessToken);
      }
      toast.success('Account created! Welcome to Shaj.');
      router.push('/account');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Registration failed. Please try again.');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) return;
    mutation.mutate();
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* Left — benefits */}
        <div className="hidden lg:block">
          <Link href="/" className="text-3xl font-black tracking-tight text-gray-900 block mb-8">SHAJ</Link>
          <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            Join 200K+ fashion lovers
          </h2>
          <p className="text-gray-500 mb-8">
            Create your free account and enjoy a premium shopping experience with exclusive perks.
          </p>
          <div className="space-y-4">
            {PERKS.map(perk => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-sm text-gray-700">{perk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div>
          <div className="text-center lg:text-left mb-6 lg:hidden">
            <Link href="/" className="text-3xl font-black tracking-tight text-gray-900">SHAJ</Link>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h1 className="text-xl font-bold text-gray-900 mb-6">Create account</h1>

            <form onSubmit={submit} className="space-y-4">
              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">First name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.firstName}
                      onChange={f('firstName')}
                      placeholder="Rahim"
                      required
                      autoComplete="given-name"
                      className="w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Last name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={f('lastName')}
                    placeholder="Uddin"
                    autoComplete="family-name"
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={f('email')}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={f('phone')}
                    placeholder="01XXXXXXXXX"
                    autoComplete="tel"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.password}
                    onChange={f('password')}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password.length > 0 && form.password.length < 8 && (
                  <p className="text-xs text-red-500 mt-1">At least 8 characters required</p>
                )}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending || !form.firstName || !form.email || !form.password}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
              >
                {mutation.isPending ? <Spinner /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
              </button>

              <p className="text-xs text-gray-400 text-center">
                By registering you agree to our{' '}
                <Link href="/terms" className="text-gray-600 hover:text-black underline">Terms</Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-gray-600 hover:text-black underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-black font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
