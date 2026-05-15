"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowUpRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import api from "@/lib/api"
import { formatBDT, formatDate } from "@shaj/utils"

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
type PaymentStatus = "paid" | "unpaid" | "refunded" | "partial"

interface RecentOrder {
  id: string
  orderNumber: string
  customer: {
    name: string
    email: string
  }
  status: OrderStatus
  paymentStatus: PaymentStatus
  total: number
  createdAt: string
  itemsCount: number
}

interface RecentOrdersResponse {
  orders: RecentOrder[]
}

const orderStatusConfig: Record<OrderStatus, { label: string; variant: "success" | "warning" | "destructive" | "info" | "secondary" | "purple" }> = {
  pending: { label: "Pending", variant: "warning" },
  processing: { label: "Processing", variant: "info" },
  shipped: { label: "Shipped", variant: "purple" },
  delivered: { label: "Delivered", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refunded: { label: "Refunded", variant: "secondary" },
}

const paymentStatusConfig: Record<PaymentStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  paid: { label: "Paid", variant: "success" },
  unpaid: { label: "Unpaid", variant: "warning" },
  refunded: { label: "Refunded", variant: "destructive" },
  partial: { label: "Partial", variant: "secondary" },
}

export function RecentOrdersTable() {
  const { data, isLoading } = useQuery<RecentOrdersResponse>({
    queryKey: ["recent-orders"],
    queryFn: async () => {
      const res = await api.get("/orders?limit=8&sortBy=createdAt&sortOrder=desc")
      return res.data
    },
  })

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/orders" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            View All Orders <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="pr-6">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (data?.orders ?? []).map((order) => {
                  const statusCfg = orderStatusConfig[order.status]
                  const paymentCfg = paymentStatusConfig[order.paymentStatus]
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        window.location.href = `/orders/${order.id}`
                      }}
                    >
                      <TableCell className="pl-6 font-medium text-primary">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{order.customer.name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={paymentCfg.variant}>{paymentCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{formatBDT(order.total)}</TableCell>
                      <TableCell className="pr-6 text-muted-foreground text-xs">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
