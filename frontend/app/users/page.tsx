"use client"

import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { AppLayout } from "@/components/layout/AppLayout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import type { PaginatedResponse, User } from "@/types"


const roleColors: Record<string, string> = {
  ADMIN: "bg-rose-500/15 text-rose-700",
  ANALYST: "bg-amber-500/15 text-amber-700",
  VIEWER: "bg-slate-500/15 text-slate-700",
}


export default function UsersPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUserQuery = useQuery<User>({ queryKey: ["current-user"], queryFn: async () => (await api.get<User>("/auth/me")).data })
  const usersQuery = useQuery<PaginatedResponse<User> | User[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get<PaginatedResponse<User> | User[]>("/users")).data,
  })

  React.useEffect(() => {
    if (currentUserQuery.data && currentUserQuery.data.role !== "ADMIN") {
      router.replace("/dashboard")
    }
  }, [currentUserQuery.data, router])

  const updateUser = useMutation({
    mutationFn: async ({ userId, payload }: { userId: string; payload: Partial<User> }) => api.put(`/users/${userId}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  })

  const items = Array.isArray(usersQuery.data) ? usersQuery.data : usersQuery.data?.items ?? []

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Users</h1>
          <p className="mt-1 text-sm text-slate-500">Manage access, roles, and user lifecycle.</p>
        </div>

        <Card className="border-slate-200 bg-white">
          <CardHeader>
            <CardTitle>User management</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersQuery.isLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role change</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => {
                    const self = currentUserQuery.data?.id === user.id
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>{(user.full_name ?? user.email).slice(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-slate-950">{user.full_name ?? "Unnamed user"}</div>
                              <div className="text-xs text-slate-500">ID {user.id.slice(0, 8)}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge className={roleColors[user.role]}>{user.role}</Badge></TableCell>
                        <TableCell>
                          <Switch
                            checked={user.is_active}
                            disabled={self}
                            onCheckedChange={(checked) => updateUser.mutate({ userId: user.id, payload: { is_active: checked } })}
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={user.role} onValueChange={(value) => updateUser.mutate({ userId: user.id, payload: { role: value as User["role"] } })}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                              <SelectItem value="ANALYST">ANALYST</SelectItem>
                              <SelectItem value="VIEWER">VIEWER</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString("en-GB")}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
