"use client"

import { useQuery } from "@tanstack/react-query"
import { Area, AreaChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowDownRight, ArrowUpRight, DollarSign, ReceiptText } from "lucide-react"

import { AppLayout } from "@/components/layout/AppLayout"
import { StatCard } from "@/components/ui/StatCard"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import type { DashboardResponse } from "@/types"


const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 })

function formatAmount(value: string | number) {
  return `₹${inr.format(Number(value))}`
}


export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery<DashboardResponse>({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/analytics/dashboard")).data,
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">A financial snapshot of income, expense, and recent activity.</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-white">
            <CardContent className="p-6">
              <p className="font-medium text-slate-950">Unable to load dashboard.</p>
              <p className="mt-1 text-sm text-slate-500">Check the backend connection and retry.</p>
              <button className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm text-white" onClick={() => refetch()}>
                Retry
              </button>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={ArrowUpRight} label="Total Income" value={formatAmount(data.summary.total_income)} change="Healthy inflow" changeType="positive" />
              <StatCard icon={ArrowDownRight} label="Total Expenses" value={formatAmount(data.summary.total_expenses)} change="Controlled outflow" changeType="negative" />
              <StatCard icon={DollarSign} label="Net Balance" value={formatAmount(data.summary.net_balance)} change="Current position" changeType={Number(data.summary.net_balance) >= 0 ? "positive" : "negative"} />
              <StatCard icon={ReceiptText} label="Transactions" value={String(data.summary.transaction_count)} change="All time" />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>Monthly Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly_trend}>
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(value) => formatAmount(value)} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value) => typeof value === 'number' ? formatAmount(value) : value} />
                      <Area type="monotone" dataKey="income" stroke="#10B981" fill="#10B981" fillOpacity={0.18} strokeWidth={2} />
                      <Area type="monotone" dataKey="expenses" stroke="#F43F5E" fill="#F43F5E" fillOpacity={0.18} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.category_breakdown} dataKey="total" nameKey="category_name" innerRadius={65} outerRadius={95} paddingAngle={3}>
                          {data.category_breakdown.map((entry) => (
                            <Cell key={entry.category_name} fill={entry.color_hex} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => typeof value === 'number' ? formatAmount(value) : value} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {data.category_breakdown.map((item) => (
                      <div key={item.category_name} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color_hex }} />
                          <div>
                            <div className="text-sm font-medium text-slate-950">{item.category_name}</div>
                            <div className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="font-mono text-sm text-slate-700">{formatAmount(item.total)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recent_transactions.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>{item.category_name ?? "Uncategorized"}</TableCell>
                        <TableCell>
                          <Badge className={item.type === "INCOME" ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}>{item.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-slate-500">{item.notes ?? "-"}</TableCell>
                        <TableCell className={`text-right font-mono ${item.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>{formatAmount(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  )
}
