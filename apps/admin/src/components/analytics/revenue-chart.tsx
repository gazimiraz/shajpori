"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { formatBDT } from "@shaj/utils"

type Period = "7d" | "30d" | "90d" | "1y"

interface RevenueDataPoint {
  date: string
  revenue: number
  orders: number
}

interface RevenueChartResponse {
  data: RevenueDataPoint[]
  total: number
  change: number
}

const periods: { label: string; value: Period }[] = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
]

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {formatBDT(payload[0]?.value ?? 0)}
        </p>
        {payload[1] && (
          <p className="text-xs text-muted-foreground">{payload[1].value} orders</p>
        )}
      </div>
    )
  }
  return null
}

export function RevenueChart() {
  const [period, setPeriod] = useState<Period>("30d")

  const { data, isLoading } = useQuery<RevenueChartResponse>({
    queryKey: ["revenue-chart", period],
    queryFn: async () => {
      const res = await api.get(`/analytics/revenue-chart?period=${period}`)
      return res.data
    },
  })

  return (
    <Card className="col-span-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
          {isLoading ? (
            <Skeleton className="h-7 w-36" />
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {formatBDT(data?.total ?? 0)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full",
                  (data?.change ?? 0) >= 0
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                <TrendingUp className="h-3 w-3" />
                {Math.abs(data?.change ?? 0).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
          {periods.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs",
                period === p.value && "shadow-sm"
              )}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.data ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
