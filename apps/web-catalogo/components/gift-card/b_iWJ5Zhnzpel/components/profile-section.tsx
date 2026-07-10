"use client"

import { cn } from "@/lib/utils"
import { User, Settings, Bell, CreditCard, LogOut, Database } from "lucide-react"

/*
  PROFILE SECTION COMPONENT
  =========================
  Placeholder profile section with subtle dev card
*/

interface ProfileItemProps {
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

function ProfileItem({ icon, label, onClick }: ProfileItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4",
        "transition-colors duration-150",
        "hover:bg-secondary/50",
        "focus-visible:outline-none focus-visible:bg-secondary/50",
        "min-h-[56px]" // Touch target
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-foreground">{label}</span>
    </button>
  )
}

export function ProfileSection() {
  return (
    <section className="space-y-6">
      {/* Profile Header */}
      <div className="flex items-center gap-4 px-1">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-foreground">María García</h2>
          <p className="text-sm text-muted-foreground">maria@ejemplo.com</p>
        </div>
      </div>

      {/* Profile Menu */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
        <ProfileItem
          icon={<User className="w-5 h-5" />}
          label="Editar perfil"
        />
        <ProfileItem
          icon={<Bell className="w-5 h-5" />}
          label="Notificaciones"
        />
        <ProfileItem
          icon={<CreditCard className="w-5 h-5" />}
          label="Métodos de pago"
        />
        <ProfileItem
          icon={<Settings className="w-5 h-5" />}
          label="Configuración"
        />
      </div>

      {/* Logout */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <ProfileItem
          icon={<LogOut className="w-5 h-5" />}
          label="Cerrar sesión"
        />
      </div>

      {/* Dev Card - Muted */}
      <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-dashed border-border">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Database className="w-4 h-4" />
          <div className="text-xs">
            <p className="font-medium">Conexión Supabase</p>
            <p className="opacity-70">Estado: pendiente configuración</p>
          </div>
        </div>
      </div>
    </section>
  )
}
