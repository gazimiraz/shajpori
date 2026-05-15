"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ShoppingCart,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Download,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
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

type OrderStatus = "all" | "pending" | "processing" | "shipped" | "delivered" | "cancelled"
type PaymentStatus = "all" | "paid" | "unpaid" | "refunded"

interface Order {
  id: string
  orderNumber: string
  customer: { name: string; email: string }
  itemsCount: number
  total: number
  paymentStatus: "paid" | "unpaid" | "refunded" | "partial"
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled"
  createdAt: string
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  totalPages: number
  stats: {
    total: number
    pending: number
    processing: number
    delivered: number
  }
}

const statusVariants: Record<string, "warning" | "info" | "purple" | "success" | "destructive" | "secondary"> = {
  pending: "warning",
  processing: "info",
  shipped: "purple",
  delivered: "success",
  cancelled: "destructive",
}

const paymentVariants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  paid: "success",
  unpaid: "warning",
  refunded: "destructive",
  partial: "secondary",
}

const statCards = [
  { key: "total", label: "Total Orders", icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
  { key: "pending", label: "Pending", icon: Clock, color: "text-yellow-600 bg-yellow-50" },
  { key: "processing", label: "Processing", icon: Loader2, color: "text-indigo-600 bg-indigo-50" },
  { key: "delivered", label: "Delivered", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
]

export default function OrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<OrderStatus>("all")
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus>("all")

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["orders", page, search, statusFilter, paymentFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        sortBy: "createdAt",
        sortOrder: "desc",
      })
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (paymentFilter !== "all") params.set("paymentStatus", paymentFilter)
      const res = await api.get(`/orders?${params}`)
      return res.data
    },
  })

  const handleExport = async () => {
    const res = await api.get("/orders/export?format=csv", { responseType: "blob" })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement("a")
    a.href = url
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            View and manage all customer orders
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  <p className="text-xl font-bold">
                    {(data?.stats?.[key as keyof typeof data.stats] ?? 0).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order # or customer..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as OrderStatus); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Order Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v as PaymentStatus); setPage(1) }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="pr-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : (data?.orders ?? []).map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="pl-6">
                      <span className="font-medium text-primary">#{order.orderNumber}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{order.customer.name}</p>
                        <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{order.itemsCount} items</TableCell>
                    <TableCell className="font-medium">{formatBDT(order.total)}</TableCell>
                    <TableCell>
                      <Badge variant={paymentVariants[order.paymentStatus] ?? "secondary"}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[order.status] ?? "secondary"}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell className="pr-6">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/orders/${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : (
              `Showing page ${data?.page ?? 1} of ${data?.totalPages ?? 1} (${data?.total ?? 0} total)`
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!data || page >= data.totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
