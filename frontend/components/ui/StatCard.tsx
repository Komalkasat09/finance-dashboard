import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"


export function StatCard({
  icon: Icon,
  label,
  value,
  change,
  changeType = "neutral",
}: {
  icon: LucideIcon
  label: string
  value: string
  change?: string
  changeType?: "positive" | "negative" | "neutral"
}) {
  const changeColor =
    changeType === "positive"
      ? "text-emerald-600"
      : changeType === "negative"
        ? "text-rose-600"
        : "text-slate-500"

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="mt-2 font-mono text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
          {change ? (
            <div className={`mt-2 flex items-center gap-1 text-sm ${changeColor}`}>
              {changeType === "positive" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {change}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
