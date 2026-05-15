"use client"

import { Brain, TrendingUp, AlertTriangle, Lightbulb, Activity, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

type InsightType = "forecast" | "alert" | "recommendation" | "anomaly"

interface AIInsightDto {
  id: string
  type: InsightType
  title: string
  description: string
  confidence: number
  createdAt?: string
}

interface AIInsightsPanelProps {
  insights: AIInsightDto[]
}

const insightConfig: Record<
  InsightType,
  {
    icon: React.ElementType
    badgeClass: string
    iconClass: string
    label: string
    badgeVariant: "info" | "destructive" | "success" | "warning"
  }
> = {
  forecast: {
    icon: TrendingUp,
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    iconClass: "text-blue-500 bg-blue-50",
    label: "Forecast",
    badgeVariant: "info",
  },
  alert: {
    icon: AlertTriangle,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    iconClass: "text-red-500 bg-red-50",
    label: "Alert",
    badgeVariant: "destructive",
  },
  recommendation: {
    icon: Lightbulb,
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    iconClass: "text-green-500 bg-green-50",
    label: "Recommendation",
    badgeVariant: "success",
  },
  anomaly: {
    icon: Activity,
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    iconClass: "text-orange-500 bg-orange-50",
    label: "Anomaly",
    badgeVariant: "warning",
  },
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-red-500"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
        {value}%
      </span>
    </div>
  )
}

function InsightCard({ insight }: { insight: AIInsightDto }) {
  const config = insightConfig[insight.type]
  const Icon = config.icon

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className={cn("h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0", config.iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight">{insight.title}</p>
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0",
              config.badgeClass
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Confidence</p>
          <ConfidenceBar value={insight.confidence} />
        </div>
      </div>
    </div>
  )
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <div className="h-7 w-7 rounded-md bg-purple-100 flex items-center justify-center">
          <Brain className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Insights</h3>
          <p className="text-xs text-muted-foreground">{insights.length} active insights</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 py-10 text-center px-4">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Generating insights...</p>
          <p className="text-xs text-muted-foreground">
            Our AI is analyzing your business data to surface actionable insights.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
