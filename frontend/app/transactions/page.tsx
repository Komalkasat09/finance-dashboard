"use client"

import * as React from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Download, Edit, Plus, Trash2 } from "lucide-react"

import { AppLayout } from "@/components/layout/AppLayout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import type { Category, PaginatedResponse, Transaction, TransactionType, User } from "@/types"


const schema = z.object({
  amount: z.number().positive(),
  type: z.enum(["INCOME", "EXPENSE"]),
  category_id: z.string().uuid().nullable(),
  date: z.string().min(1),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>


export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)
  const [type, setType] = React.useState<string>("ALL")
  const [category, setCategory] = React.useState<string>("ALL")
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [search, setSearch] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Transaction | null>(null)

  const me = useQuery<User>({
    queryKey: ["current-user"],
    queryFn: async () => (await api.get<User>("/auth/me")).data,
  })

  const transactions = useQuery<PaginatedResponse<Transaction>>({
    queryKey: ["transactions", page, pageSize, type, category, dateFrom, dateTo, search],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Transaction>>("/transactions", {
        params: {
          page,
          page_size: pageSize,
          ...(type === "ALL" ? {} : { type }),
          ...(category === "ALL" ? {} : { category_id: category }),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
          ...(search ? { q: search } : {}),
        },
      })
      return response.data
    },
  })

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => (await api.get<Category[]>("/categories")).data,
  })

  const firstCategoryId = categoriesQuery.data?.[0]?.id ?? null

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
      type: "EXPENSE",
      category_id: null,
      date: new Date().toISOString().slice(0, 10),
      notes: "",
    } satisfies FormValues,
  })
  const watchedType = useWatch({ control: form.control, name: "type" })
  const watchedCategoryId = useWatch({ control: form.control, name: "category_id" })

  React.useEffect(() => {
    if (editing) {
      form.reset({
        amount: Number(editing.amount),
        type: editing.type,
        category_id: editing.category_id,
        date: editing.date,
        notes: editing.notes ?? "",
      })
      return
    }

    if (dialogOpen) {
      form.reset({
        amount: 0,
        type: "EXPENSE",
        category_id: firstCategoryId,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      })
    }
  }, [dialogOpen, editing, firstCategoryId, form])

  const upsertMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        amount: values.amount,
        type: values.type,
        category_id: values.category_id,
        date: values.date,
        notes: values.notes || null,
      }
      if (editing) {
        return api.put(`/transactions/${editing.id}`, payload)
      }
      return api.post("/transactions", payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] })
      setDialogOpen(false)
      setEditing(null)
    },
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get("/transactions/export", {
        params: {
          ...(type === "ALL" ? {} : { type }),
          ...(category === "ALL" ? {} : { category_id: category }),
          ...(dateFrom ? { date_from: dateFrom } : {}),
          ...(dateTo ? { date_to: dateTo } : {}),
          ...(search ? { q: search } : {}),
        },
        responseType: "blob",
      })
      const blob = new Blob([response.data as BlobPart], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "transactions.csv"
      anchor.click()
      URL.revokeObjectURL(url)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (transactionId: string) => api.delete(`/transactions/${transactionId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  })

  const canMutate = me.data?.role === "ADMIN" || me.data?.role === "ANALYST"

  const submitForm = form.handleSubmit((values) => {
    upsertMutation.mutate(values)
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Transactions</h1>
            <p className="mt-1 text-sm text-slate-500">Filter, edit, export, and govern the transaction ledger.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canMutate ? <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Add Transaction</Button> : null}
            {canMutate ? <Button variant="outline" onClick={() => exportMutation.mutate()}><Download className="mr-2 h-4 w-4" /> Export CSV</Button> : null}
          </div>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Input placeholder="Search notes or category" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {(categoriesQuery.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger><SelectValue placeholder="Rows" /></SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={() => { setType("ALL"); setCategory("ALL"); setDateFrom(""); setDateTo(""); setSearch("") }}>Clear filters</Button>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-0">
            {transactions.isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 rounded-xl" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {me.data?.role === "ADMIN" ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data?.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.date).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>{item.category_name ?? "Uncategorized"}</TableCell>
                      <TableCell>
                        <Badge className={item.type === "INCOME" ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700"}>{item.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-slate-500">{item.notes ?? "-"}</TableCell>
                      <TableCell className={`text-right font-mono ${item.type === "INCOME" ? "text-emerald-600" : "text-rose-600"}`}>₹{Number(item.amount).toLocaleString("en-IN")}</TableCell>
                      {me.data?.role === "ADMIN" ? (
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setEditing(item); setDialogOpen(true) }}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                            <Button variant="destructive" size="sm" onClick={() => window.confirm("Delete this transaction?") && deleteMutation.mutate(item.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <button className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <span>
            Page {transactions.data?.page ?? page} of {transactions.data?.total_pages ?? 1}
          </span>
          <button className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-50" disabled={page >= (transactions.data?.total_pages ?? 1)} onClick={() => setPage((value) => value + 1)}>Next</button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
              <DialogDescription>Capture a new transaction or update an existing one.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={submitForm}>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={watchedType} onValueChange={(value) => form.setValue("type", value as TransactionType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Income</SelectItem>
                    <SelectItem value="EXPENSE">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={watchedCategoryId ?? ""} onValueChange={(value) => form.setValue("category_id", value || null)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(categoriesQuery.data ?? []).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...form.register("date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea id="notes" className="min-h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" {...form.register("notes")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={upsertMutation.isPending}>{editing ? "Save changes" : "Create transaction"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  )
}
