'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingCart, Users, Package,
  ArrowUpRight, ArrowDownRight, DollarSign, BarChart3,
  AlertTriangle, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { TopProductsTable } from '@/components/analytics/top-products-table';
import { RecentOrdersTable } from '@/components/orders/recent-orders-table';
import { SalesByCategoryChart } from '@/components/analytics/sales-by-category-chart';
import { AIInsightsPanel } from '@/components/ai/ai-insights-panel';
import { api } from '@/lib/api';
import { formatBDT } from '@shaj/utils';
import { cn } from '@/lib/utils';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface StatCard {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<any>;
  color: string;
  prefix?: string;
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data.data),
    refetchInterval: 30000,
  });

  const { data: aiInsights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get('/ai/insights').then(r => r.data.data),
  });

  const statCards: StatCard[] = [
    {
      title: "Today's Revenue",
      value: formatBDT(stats?.today?.revenue ?? 0),
      change: stats?.growth?.revenue ?? 0,
      icon: DollarSign,
      color: 'text-emerald-500',
    },
    {
      title: "Today's Orders",
      value: String(stats?.today?.orders ?? 0),
      change: stats?.growth?.orders ?? 0,
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'New Customers',
      value: String(stats?.today?.newCustomers ?? 0),
      change: stats?.growth?.customers ?? 0,
      icon: Users,
      color: 'text-violet-500',
    },
    {
      title: 'Avg Order Value',
      value: formatBDT(stats?.today?.avgOrderValue ?? 0),
      change: 0,
      icon: TrendingUp,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 text-emerald-500 border-emerald-200 bg-emerald-50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((stat) => (
          <motion.div key={stat.title} variants={item}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    stat.change >= 0 ? 'text-emerald-500' : 'text-red-500'
                  )}>
                    {stat.change >= 0
                      ? <ArrowUpRight className="w-3 h-3" />
                      : <ArrowDownRight className="w-3 h-3" />
                    }
                    {Math.abs(stat.change)}%
                  </div>
                </div>
                <div>
                  {isLoading ? (
                    <div className="h-7 w-24 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div>
          <SalesByCategoryChart />
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentOrdersTable />
        </div>
        <div>
          <AIInsightsPanel insights={aiInsights ?? []} />
        </div>
      </div>

      {/* Top Products */}
      <TopProductsTable />
    </div>
  );
}
