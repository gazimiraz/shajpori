'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ShoppingBag, BarChart3, Package, Users, TrendingUp, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import s from './login.module.css';

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
      className={s.page}
      style={{ background: 'linear-gradient(135deg, #160010 0%, #1a0020 50%, #0d0008 100%)' }}
    >
      {/* Pink glow blobs */}
      <div
        className={s.blob}
        style={{ top: '-100px', left: '-80px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255,45,120,0.28) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />
      <div
        className={s.blob}
        style={{ bottom: '-80px', right: '-60px', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(200,0,80,0.22) 0%, transparent 70%)', filter: 'blur(60px)' }}
      />

      {/* Grid */}
      <div className={s.grid} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={s.wrapper}
      >
        {/* Brand header */}
        <div className={s.header}>
          <div
            className={s.logoWrap}
            style={{ background: 'linear-gradient(135deg, #ff2d78, #c4005a)', boxShadow: '0 8px 32px rgba(255,45,120,0.4)' }}
          >
            <ShoppingBag size={28} color="#fff" />
          </div>

          <div
            className={s.badge}
            style={{ background: 'rgba(255,45,120,0.12)', border: '1px solid rgba(255,45,120,0.3)' }}
          >
            <span className={s.badgeDot} />
            <span className={s.badgeText}>Admin Control Center</span>
          </div>

          <h1 className={s.brandTitle}>Shaj Ecom</h1>
          <p className={s.brandSub}>Enterprise Management Platform</p>
        </div>

        {/* Card */}
        <div
          className={s.card}
          style={{ background: 'rgba(20,5,15,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,45,120,0.15)' }}
        >
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Welcome back</h2>
            <p className={s.cardSub}>Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={s.form}>
            {/* Email */}
            <div className={s.field}>
              <label className={s.label}>Email address</label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@shaj.com"
                className={s.inputSimple}
              />
              {errors.email && <p className={s.errorMsg}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className={s.field}>
              <div className={s.fieldRow}>
                <label className={s.label}>Password</label>
                <a href="/auth/forgot-password" className={s.forgotLink}>Forgot password?</a>
              </div>
              <div className={s.inputWrap}>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={s.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={s.eyeBtn}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className={s.errorMsg}>{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading} className={s.submitBtn}>
              {isLoading ? (
                <><Loader2 size={16} className={s.spinIcon} /> Signing in...</>
              ) : (
                'Sign in to Dashboard'
              )}
            </button>
          </form>

          {/* Stats */}
          <div className={s.stats}>
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className={s.statItem}>
                <Icon size={16} className={s.statIcon} />
                <p className={s.statValue}>{value}</p>
                <p className={s.statLabel}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={s.footer}>
          <Shield size={14} color="#334155" />
          <p className={s.footerText}>© {new Date().getFullYear()} Shaj Fashion · Secure Access</p>
        </div>
      </motion.div>
    </div>
  );
}
