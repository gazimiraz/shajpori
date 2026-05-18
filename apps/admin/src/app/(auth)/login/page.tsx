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
  { icon: BarChart3,  label: 'Revenue',   value: '৳2.4M' },
  { icon: Package,    label: 'Orders',    value: '12.8k' },
  { icon: Users,      label: 'Customers', value: '4.3k'  },
  { icon: TrendingUp, label: 'Growth',    value: '+32%'  },
];

// hot-pink palette
const pink = {
  main:   '#ff2d78',
  light:  '#ff6fa8',
  dark:   '#c4005a',
  glow:   'rgba(255,45,120,0.35)',
  subtle: 'rgba(255,45,120,0.12)',
  border: 'rgba(255,45,120,0.3)',
};

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
      style={{ background: 'linear-gradient(135deg, #160010 0%, #1a0020 50%, #0d0008 100%)' }}
    >
      {/* Pink glow blobs */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ top: '-100px', left: '-80px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,45,120,0.28) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ bottom: '-80px', right: '-60px', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(200,0,80,0.22) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,45,120,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,45,120,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,120,0.05) 1px, transparent 1px)',
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
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{
              background: `linear-gradient(135deg, ${pink.main}, ${pink.dark})`,
              boxShadow: `0 8px 32px ${pink.glow}`,
            }}
          >
            <ShoppingBag className="w-7 h-7 text-white" />
          </div>

          <div
            className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full"
            style={{ background: pink.subtle, border: `1px solid ${pink.border}` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: pink.light }}
            />
            <span
              className="text-xs font-medium tracking-widest uppercase"
              style={{ color: pink.light }}
            >
              Admin Control Center
            </span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-1">Shaj Ecom</h1>
          <p className="text-slate-400">Enterprise Management Platform</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl shadow-2xl p-8"
          style={{
            background: 'rgba(20,5,15,0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,45,120,0.15)',
          }}
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
                className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
                style={{ outline: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = pink.main)}
                onBlur={e => (e.currentTarget.style.borderColor = '')}
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm font-medium">Password</Label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: pink.light }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-11 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl pr-11"
                  style={{ outline: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = pink.main)}
                  onBlur={e => (e.currentTarget.style.borderColor = '')}
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
              className="w-full h-11 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-opacity duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${pink.main}, ${pink.dark})`,
                boxShadow: `0 4px 20px ${pink.glow}`,
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
            style={{ borderTop: '1px solid rgba(255,45,120,0.12)' }}
          >
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center">
                <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: pink.light }} />
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
