"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeftRight, LayoutDashboard, LogOut, User, Users } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { clearTokens } from "@/lib/auth"
import type { User as UserType } from "@/types"


const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/profile", label: "Profile", icon: User },
]

export function Sidebar({ currentUser }: { currentUser: UserType }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    clearTokens()
    router.replace("/login")
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-800 bg-slate-950 px-4 py-5 text-slate-100">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30">
          FD
        </div>
        <div>
          <div className="font-mono text-lg font-semibold tracking-tight">FinanceDash</div>
          <div className="text-xs text-slate-400">Terminal-grade finance control</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation
          .filter((item) => !item.adminOnly || currentUser.role === "ADMIN")
          .map((item) => {
            const Icon = item.icon
            const active = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-emerald-400 bg-slate-900 text-white"
                    : "border-transparent text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
      </nav>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-slate-700 bg-slate-800">
            <AvatarFallback className="bg-slate-800 text-slate-100">
              {currentUser.full_name?.slice(0, 2).toUpperCase() ?? currentUser.email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{currentUser.full_name ?? currentUser.email}</div>
            <Badge className="mt-1 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">{currentUser.role}</Badge>
          </div>
        </div>
        <Button variant="outline" className="mt-4 w-full justify-start border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
