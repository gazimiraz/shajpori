'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Loader2, ShoppingBag,
  BarChart3, Package, Users, TrendingUp,
  ArrowRight, Shield, Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

const stats = [
  { icon: BarChart3, label: 'Revenue', value: '৳2.4M', change: '+18%' },
  { icon: Package, label: 'Orders', value: '12,840', change: '+9%' },
  { icon: Users, label: 'Customers', value: '4,320', change: '+24%' },
  { icon: TrendingUp, label: 'Growth', value: '32%', change: '+6%' },
];

const features = [
  { icon: BarChart3, text: 'Real-time analytics & reporting' },
  { icon: Shield, text: 'Enterprise-grade security' },
  { icon: Zap, text: 'Lightning-fast performance' },
];

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { login, isLoading } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error?.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#09090f' }}>

      {/* ── Left panel: branding ── */}
      <div
        className="hidden lg:flex lg:w-7/12 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d0d2b 0%, #0f1d4a 50%, #090919 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ top: -100, left: -80, width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{ bottom: -60, right: -60, width: 320, height: 320, background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl">Shaj Ecom</span>
          </div>

          {/* Hero */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 bg-blue-900 border border-blue-700 rounded-full px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-blue-300 text-xs font-medium tracking-widest uppercase">Admin Control Center</span>
              </span>

              <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
                Manage your
                <span className="block text-blue-400">
                  business effortlessly
                </span>
              </h1>

              <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
                Complete e-commerce management with real-time insights, order tracking, and advanced analytics.
              </p>

              {/* Feature pills */}
              <div className="space-y-3 mb-12">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-900 border border-blue-700 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-3"
            >
              {stats.map(({ icon: Icon, label, value, change }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4 border border-slate-700"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full">
                      {change}
                    </span>
                  </div>
                  <p className="text-white font-bold text-xl">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Shaj Fashion. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, #09090f 0%, #07070d 100%)' }}
        />

        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">Shaj Ecom</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your admin account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-sm">Email address</Label>
              <Input
                {...register('email')}
                type="email"
                placeholder="admin@shaj.com"
                className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 rounded-xl"
              />
              {errors.email && (
                <p className="text-red-400 text-xs">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-sm">Password</Label>
                <a href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-blue-500 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading ? '#1e3a8a' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: '0 4px 24px rgba(37,99,235,0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-800 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-slate-600 text-xs">Shaj Admin — Secure Access Portal</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
