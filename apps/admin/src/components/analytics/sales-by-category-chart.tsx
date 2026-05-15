"use client"

import { useQuery } from "@tanstack/react-query"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import api from "@/lib/api"
import { formatBDT } from "@shaj/utils"

interface CategoryData {
  name: string
  revenue: number
  percentage: number
  color: string
}

interface CategoriesResponse {
  categories: CategoryData[]
  total: number
}

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
]

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const item = payload[0]
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-semibold">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatBDT(item.value ?? 0)}</p>
        <p className="text-xs text-muted-foreground">{(item.payload as CategoryData).percentage.toFixed(1)}%</p>
      </div>
    )
  }
  return null
}

export function SalesByCategoryChart() {
  const { data, isLoading } = useQuery<CategoriesResponse>({
    queryKey: ["analytics-categories"],
    queryFn: async () => {
      const res = await api.get("/analytics/categories")
      return res.data
    },
  })

  const chartData = (data?.categories ?? []).map((cat, i) => ({
    ...cat,
    color: cat.color || COLORS[i % COLORS.length],
  }))

  return (
    <Card className="col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Sales by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="w-full space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="revenue"
                  nameKey="name"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {chartData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-16 bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">
                      {cat.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
