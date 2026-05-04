import { Calendar, Sparkles, Clock, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <Sparkles className="w-6 h-6 text-[#D4AF37]" />
              <span className="ml-3 text-2xl font-light tracking-wider text-[#2C2C2C]">
                AppSalon Pro
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a href="#servicios" className="text-[#2C2C2C] hover:text-[#D4AF37] font-light transition-colors">
                Servicios
              </a>
              <a href="#galeria" className="text-[#2C2C2C] hover:text-[#D4AF37] font-light transition-colors">
                Galería
              </a>
              <a href="#contacto" className="text-[#2C2C2C] hover:text-[#D4AF37] font-light transition-colors">
                Contacto
              </a>
            </div>
            <button className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-light hover:bg-[#C0A030] transition-colors">
              Reservar Cita
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-light tracking-wide text-[#2C2C2C] mb-6">
              Experiencia de Lujo
              <span className="block text-[#D4AF37] mt-2">Belleza Incomparable</span>
            </h1>
            <p className="text-lg md:text-xl text-[#C0C0C0] font-light max-w-2xl mx-auto mb-12 leading-relaxed">
              Descubre un salón donde la elegancia se encuentra con la excelencia. 
              Cada servicio está diseñado para realzar tu belleza natural.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-[#D4AF37] text-white px-8 py-4 rounded-full font-light text-lg hover:bg-[#C0A030] transition-colors flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2" />
                Agendar Ahora
              </button>
              <button className="border border-[#D4AF37] text-[#D4AF37] px-8 py-4 rounded-full font-light text-lg hover:bg-[#D4AF37] hover:text-white transition-colors">
                Ver Servicios
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-light text-[#2C2C2C] mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-[#C0C0C0] font-light">
              Excelencia en cada detalle
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-[#FDFBF7] hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-[#D4AF37]" fill="#D4AF37" />
              </div>
              <h3 className="text-xl font-light text-[#2C2C2C] mb-3">
                Profesionales Certificados
              </h3>
              <p className="text-[#C0C0C0] font-light leading-relaxed">
                Nuestro equipo de expertos está altamente capacitado en las últimas técnicas y tendencias
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-[#FDFBF7] hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-light text-[#2C2C2C] mb-3">
                Productos Premium
              </h3>
              <p className="text-[#C0C0C0] font-light leading-relaxed">
                Utilizamos solo productos de la más alta calidad para garantizar resultados excepcionales
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-[#FDFBF7] hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <h3 className="text-xl font-light text-[#2C2C2C] mb-3">
                Reserva Fácil
              </h3>
              <p className="text-[#C0C0C0] font-light leading-relaxed">
                Sistema de reservas online disponible 24/7 para tu comodidad
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#2C2C2C]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-light text-white mb-6">
            Comienza tu Transformación
          </h2>
          <p className="text-xl text-white/70 font-light mb-8">
            Reserva tu cita hoy y descubre la diferencia
          </p>
          <button className="bg-[#D4AF37] text-white px-10 py-4 rounded-full font-light text-lg hover:bg-[#C0A030] transition-colors">
            Reservar Ahora
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-[#D4AF37]" />
            <span className="ml-3 text-2xl font-light tracking-wider text-[#2C2C2C]">
              AppSalon Pro
            </span>
          </div>
          <p className="text-[#C0C0C0] font-light text-sm">
            © 2026 AppSalon Pro. Todos los derechos reservados.
          </p>
          <p className="text-[#C0C0C0] font-light text-xs mt-2">
            Powered by Supabase • Built with Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}
