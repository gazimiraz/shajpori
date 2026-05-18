'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShoppingBag, BarChart3, Package, Users, TrendingUp, Shield } from 'lucide-react';
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
  { icon: BarChart3, label: 'Revenue', value: '৳2.4M' },
  { icon: Package,   label: 'Orders',  value: '12.8k' },
  { icon: Users,     label: 'Customers', value: '4.3k' },
  { icon: TrendingUp, label: 'Growth',  value: '+32%' },
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0d0d2b 0%, #0f1d4a 50%, #090919 100%)' }}
    >
      {/* Decorative blobs — inline styles so they always render */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ top: '-120px', left: '-80px', width: '480px', height: '480px', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ bottom: '-80px', right: '-60px', width: '360px', height: '360px', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Brand header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}
          >
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>

          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-400 text-xs font-medium tracking-widest uppercase">Admin Control Center</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-1">Shaj Ecom</h1>
          <p className="text-slate-400">Enterprise Management Platform</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl shadow-2xl p-8"
          style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm font-medium">Email address</Label>
              <Input
                {...register('email')}
                type="email"
                placeholder="admin@shaj.com"
                className="h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 rounded-xl"
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm font-medium">Password</Label>
                <a href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 rounded-xl pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
              }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>

          {/* Stats row */}
          <div
            className="grid grid-cols-4 gap-3 mt-8 pt-6"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-white font-bold text-sm">{value}</p>
                <p className="text-slate-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Shield className="w-3.5 h-3.5 text-slate-600" />
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Shaj Fashion · Secure Access
          </p>
        </div>
      </motion.div>
    </div>
  );
}
