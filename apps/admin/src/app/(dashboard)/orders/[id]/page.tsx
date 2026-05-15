"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronRight,
  Printer,
  RefreshCw,
  ArrowLeft,
  MapPin,
  CreditCard,
  User,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"

type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled"

interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: string
  paymentMethod: string
  subtotal: number
  shippingCost: number
  tax: number
  discount: number
  total: number
  notes: string
  createdAt: string
  updatedAt: string
  customer: {
    id: string
    name: string
    email: string
    phone: string
  }
  shippingAddress: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    postcode: string
  }
  billingAddress: {
    name: string
    line1: string
    city: string
    state: string
    postcode: string
  }
  items: Array<{
    id: string
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    totalPrice: number
    image?: string
    variant?: string
  }>
  statusHistory: Array<{
    status: OrderStatus
    changedAt: string
    note?: string
  }>
  tracking?: {
    carrier: string
    trackingNumber: string
    trackingUrl: string
  }
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
  processing: { label: "Processing", icon: RefreshCw, color: "text-blue-600" },
  shipped: { label: "Shipped", icon: Truck, color: "text-purple-600" },
  delivered: { label: "Delivered", icon: CheckCircle2, color: "text-green-600" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-600" },
}

const statusOrder: OrderStatus[] = ["pending", "processing", "shipped", "delivered"]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus>("processing")

  const { data: order, isLoading } = useQuery<OrderDetail>({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`)
      return res.data
    },
  })

  const updateStatus = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const res = await api.patch(`/orders/${id}/status`, { status })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] })
      setStatusModalOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!order) return null

  const currentStatusIndex = statusOrder.indexOf(order.status)

  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/orders" className="hover:text-foreground">Orders</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">#{order.orderNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Order #{order.orderNumber}</h1>
              <Badge variant={
                order.status === "delivered" ? "success" :
                order.status === "cancelled" ? "destructive" :
                order.status === "shipped" ? "purple" :
                order.status === "processing" ? "info" : "warning"
              }>
                {order.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">Placed on {formatDate(order.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
            <RefreshCw className="h-4 w-4" />
            Refund
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setStatusModalOpen(true)}>
            <RefreshCw className="h-4 w-4" />
            Update Status
          </Button>
        </div>
      </div>

      {/* Order Progress */}
      {order.status !== "cancelled" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {statusOrder.map((s, i) => {
                const config = statusConfig[s]
                const Icon = config.icon
                const isCompleted = i <= currentStatusIndex
                const isActive = i === currentStatusIndex
                return (
                  <div key={s} className="flex flex-col items-center flex-1">
                    <div className="relative flex items-center w-full">
                      {i > 0 && (
                        <div className={cn(
                          "absolute left-0 right-1/2 top-5 h-0.5 -translate-y-1/2",
                          isCompleted ? "bg-primary" : "bg-muted"
                        )} />
                      )}
                      {i < statusOrder.length - 1 && (
                        <div className={cn(
                          "absolute left-1/2 right-0 top-5 h-0.5 -translate-y-1/2",
                          i < currentStatusIndex ? "bg-primary" : "bg-muted"
                        )} />
                      )}
                      <div className={cn(
                        "relative z-10 mx-auto h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                        isActive ? "border-primary bg-primary text-primary-foreground" :
                        isCompleted ? "border-primary bg-primary/10 text-primary" :
                        "border-muted bg-background text-muted-foreground"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={cn(
                      "mt-2 text-xs font-medium",
                      isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {config.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead className="pr-6 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6">
                        <div>
                          <p className="font-medium text-sm">{item.productName}</p>
                          {item.variant && (
                            <p className="text-xs text-muted-foreground">{item.variant}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{item.sku}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatBDT(item.unitPrice)}</TableCell>
                      <TableCell className="pr-6 text-right font-medium">{formatBDT(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="px-6 py-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatBDT(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{formatBDT(order.shippingCost)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-{formatBDT(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatBDT(order.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatBDT(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4">
                {order.statusHistory.map((h, i) => {
                  const config = statusConfig[h.status]
                  const Icon = config.icon
                  return (
                    <div key={i} className="flex gap-3">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0", config.color, "bg-current/10")}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p className="text-sm font-medium capitalize">{h.status}</p>
                        {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(h.changedAt)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground">{order.customer.email}</p>
              <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                <Link href={`/customers/${order.customer.id}`}>View Customer Profile</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-0.5">
              <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postcode}</p>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
                  {order.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tracking */}
          {order.tracking && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4" />
                  Shipment Tracking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Carrier</span>
                  <span className="font-medium">{order.tracking.carrier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tracking #</span>
                  <span className="font-mono text-xs">{order.tracking.trackingNumber}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={order.tracking.trackingUrl} target="_blank" rel="noreferrer">
                    Track Shipment
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateStatus.mutate(newStatus)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
