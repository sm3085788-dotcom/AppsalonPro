"use client"

import { useState } from "react"
import { SalonButton } from "@/components/salon-button"
import { ActionCard } from "@/components/action-card"
import { ProfileSection } from "@/components/profile-section"
import { Calendar, Clock, User, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

/*
  LUXURY HAIR SALON - MOBILE-FIRST WEB APP
  =========================================
  
  Design Tokens Used:
  - Primary: #D4AF37 (Muted Champagne Gold) - sparingly
  - Surface: #FDFBF7 (Warm Off-White)
  - On-Surface: #2D2D2D (Refined Charcoal)
  - Border: Warm subtle gray
  
  Spacing Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
  Border Radius: 16px (cards), 24px (large), 12px (buttons)
  
  WCAG: AA contrast ratios maintained
*/

type TabId = "home" | "citas" | "historial" | "perfil"

export default function SalonApp() {
  const [activeTab, setActiveTab] = useState<TabId>("home")

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Container - max-width for larger screens */}
      <div className="mx-auto max-w-md min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 pt-12 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Bienvenida
              </p>
              <h1 className="text-xl font-medium text-foreground">
                María
              </h1>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-6 pb-24">
          {activeTab === "home" && <HomeSection />}
          {activeTab === "citas" && <CitasSection />}
          {activeTab === "historial" && <HistorialSection />}
          {activeTab === "perfil" && <ProfileSection />}
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border">
          <div className="mx-auto max-w-md">
            <div className="flex items-center justify-around py-3">
              <NavItem
                icon={<Sparkles className="w-5 h-5" />}
                label="Inicio"
                isActive={activeTab === "home"}
                onClick={() => setActiveTab("home")}
              />
              <NavItem
                icon={<Calendar className="w-5 h-5" />}
                label="Mis citas"
                isActive={activeTab === "citas"}
                onClick={() => setActiveTab("citas")}
              />
              <NavItem
                icon={<Clock className="w-5 h-5" />}
                label="Historial"
                isActive={activeTab === "historial"}
                onClick={() => setActiveTab("historial")}
              />
              <NavItem
                icon={<User className="w-5 h-5" />}
                label="Perfil"
                isActive={activeTab === "perfil"}
                onClick={() => setActiveTab("perfil")}
              />
            </div>
          </div>
        </nav>
      </div>
    </div>
  )
}

/* Navigation Item */
interface NavItemProps {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function NavItem({ icon, label, isActive, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
        "min-w-[64px] min-h-[48px]", // Touch target
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

/* Home Section */
function HomeSection() {
  return (
    <div className="space-y-8">
      {/* Hero Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-foreground to-foreground/90 p-8 text-card">
        {/* Subtle gold accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60" />
        
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-[0.2em] text-card/60 mb-3">
            Tu próxima experiencia
          </p>
          <h2 className="font-serif text-3xl font-light leading-tight text-card mb-6 text-balance">
            Reserva tu cita
          </h2>
          <p className="text-sm text-card/70 mb-8 leading-relaxed max-w-[260px]">
            Descubre el arte de la belleza con nuestros estilistas expertos.
          </p>
          <SalonButton variant="primary" size="lg">
            Agendar ahora
          </SalonButton>
        </div>

        {/* Decorative element - subtle */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/5" />
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground mb-4 px-1">
          Acceso rápido
        </h3>
        <div className="space-y-3">
          <ActionCard
            icon={<Calendar className="w-5 h-5" />}
            title="Mis citas"
            subtitle="Próxima: Corte y color"
          />
          <ActionCard
            icon={<Clock className="w-5 h-5" />}
            title="Historial"
            subtitle="12 visitas este año"
          />
          <ActionCard
            icon={<User className="w-5 h-5" />}
            title="Perfil"
            subtitle="Gestiona tu cuenta"
          />
        </div>
      </section>

      {/* Featured Service - Editorial Style */}
      <section className="pt-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-primary mb-2">
                Servicio destacado
              </p>
              <h4 className="font-serif text-xl font-light text-foreground">
                Balayage Premium
              </h4>
            </div>
            <span className="text-lg font-light text-foreground">$180</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            Técnica de coloración natural que aporta luminosidad y dimensión a tu cabello.
          </p>
          <SalonButton variant="outline" className="w-full">
            Ver detalles
          </SalonButton>
        </div>
      </section>
    </div>
  )
}

/* Citas (Appointments) Section */
function CitasSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-light text-foreground mb-2">
          Mis citas
        </h2>
        <p className="text-sm text-muted-foreground">
          Gestiona tus próximas reservaciones
        </p>
      </div>

      {/* Upcoming Appointment */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-xs uppercase tracking-wider text-primary font-medium">
            Próxima cita
          </span>
        </div>
        <h3 className="font-medium text-foreground mb-1">Corte y Color</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Con Alejandra · Estilista Senior
        </p>
        <div className="flex items-center gap-4 text-sm text-foreground">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            15 Mayo, 2026
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            10:30 AM
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <SalonButton variant="outline" className="flex-1">
          Reprogramar
        </SalonButton>
        <SalonButton variant="primary" className="flex-1">
          Confirmar
        </SalonButton>
      </div>

      {/* Empty State Placeholder */}
      <div className="mt-8 text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
          <Calendar className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">
          No tienes más citas programadas
        </p>
        <SalonButton variant="secondary" className="mt-4">
          Agendar nueva cita
        </SalonButton>
      </div>
    </div>
  )
}

/* Historial Section */
function HistorialSection() {
  const history = [
    { service: "Corte y Peinado", date: "28 Abril, 2026", stylist: "Alejandra", price: "$65" },
    { service: "Tratamiento Keratin", date: "15 Abril, 2026", stylist: "Carmen", price: "$120" },
    { service: "Balayage Premium", date: "2 Abril, 2026", stylist: "Alejandra", price: "$180" },
    { service: "Corte y Color", date: "18 Marzo, 2026", stylist: "Sofía", price: "$95" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-light text-foreground mb-2">
          Historial
        </h2>
        <p className="text-sm text-muted-foreground">
          Tus visitas anteriores
        </p>
      </div>

      <div className="space-y-3">
        {history.map((item, index) => (
          <div
            key={index}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-foreground">{item.service}</h3>
              <span className="text-sm font-medium text-foreground">{item.price}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {item.date} · {item.stylist}
            </p>
          </div>
        ))}
      </div>

      <SalonButton variant="outline" className="w-full">
        Ver historial completo
      </SalonButton>
    </div>
  )
}
