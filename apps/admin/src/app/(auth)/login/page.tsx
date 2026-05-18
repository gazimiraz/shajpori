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
    <div className="min-h-screen flex bg-[#0a0a0f]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f0f2e] via-[#0d1b4b] to-[#0a0a0f]" />

        {/* Decorative orbs */}
        <div className="absolute top-[-120px] left-[-80px] w-[480px] h-[480px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-60px] w-[360px] h-[360px] rounded-full bg-indigo-500/15 blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-blue-500/10 blur-[60px] pointer-events-none" />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Shaj Ecom</span>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center mt-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-blue-400 text-xs font-medium tracking-wide uppercase">Admin Control Center</span>
              </div>

              <h1 className="text-5xl font-bold text-white leading-tight mb-4">
                Manage your
                <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  business effortlessly
                </span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
                Complete e-commerce management platform with real-time insights, order tracking, and advanced analytics.
              </p>

              {/* Feature list */}
              <div className="space-y-3 mb-12">
                {features.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Stats grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid grid-cols-2 gap-3"
            >
              {stats.map(({ icon: Icon, label, value, change }) => (
                <div
                  key={label}
                  className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 backdrop-blur-sm hover:bg-white/[0.05] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      {change}
                    </span>
                  </div>
                  <p className="text-white font-bold text-xl">{value}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Bottom */}
          <p className="text-slate-600 text-xs">
            © {new Date().getFullYear()} Shaj Fashion. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] to-[#080810]" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-600/5 blur-[80px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[400px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShoppingBag className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-white font-bold text-lg">Shaj Ecom</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
            <p className="text-slate-500">Sign in to your admin account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-sm font-medium">Email address</Label>
              <div className="relative">
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="admin@shaj.com"
                  className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/70 focus:bg-white/[0.06] focus:ring-0 focus:ring-offset-0 rounded-xl transition-colors"
                />
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-sm font-medium">Password</Label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-blue-400/80 hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-slate-600 focus:border-blue-500/70 focus:bg-white/[0.06] focus:ring-0 focus:ring-offset-0 rounded-xl pr-11 transition-colors"
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
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-800 disabled:to-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30"
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

          {/* Divider */}
          <div className="mt-8 pt-8 border-t border-white/[0.06]">
            <p className="text-slate-600 text-xs text-center">
              Protected by enterprise-grade encryption
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Shield className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-slate-600 text-xs">Shaj Admin — Secure Access Portal</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
