"use client"

import Link from "next/link"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight, Medal } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import api from "@/lib/api"
import { formatBDT } from "@shaj/utils"

interface TopProduct {
  id: string
  rank: number
  name: string
  image: string
  category: string
  revenue: number
  unitsSold: number
  sku: string
}

interface TopProductsResponse {
  products: TopProduct[]
}

const rankColors = [
  "text-yellow-500",
  "text-slate-400",
  "text-amber-600",
]

export function TopProductsTable() {
  const { data, isLoading } = useQuery<TopProductsResponse>({
    queryKey: ["top-products"],
    queryFn: async () => {
      const res = await api.get("/analytics/top-products?limit=10")
      return res.data
    },
  })

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Top Performing Products</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="space-y-3 px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {(data?.products ?? []).map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors"
              >
                <span
                  className={cn(
                    "w-6 text-center text-sm font-bold tabular-nums",
                    rankColors[product.rank - 1] ?? "text-muted-foreground"
                  )}
                >
                  {product.rank <= 3 ? (
                    <Medal className="h-4 w-4 inline-block" />
                  ) : (
                    product.rank
                  )}
                </span>
                <div className="relative h-9 w-9 overflow-hidden rounded-md border bg-muted flex-shrink-0">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                      N/A
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{formatBDT(product.revenue)}</p>
                  <p className="text-xs text-muted-foreground">{product.unitsSold.toLocaleString()} units</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
