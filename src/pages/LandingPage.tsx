import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Heart, Truck, MapPin } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-emerald-50 py-20 lg:py-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight"
            >
              Comparte comida, <span className="text-emerald-600">alimenta esperanzas</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto"
            >
              Conecta donantes de alimentos con ONGs y voluntarios. Reduce el desperdicio, combate el hambre y construye comunidades más solidarias.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/register" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                Empezar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/login" className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full bg-white text-emerald-800 border-2 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50 transition-colors">
                Iniciar Sesión
              </Link>
            </motion.div>
          </div>
        </div>
        
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-400 blur-3xl"></div>
          <div className="absolute top-1/2 -right-24 w-64 h-64 rounded-full bg-orange-300 blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">¿Cómo funciona FoodShare?</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">Un proceso simple de 3 pasos para conectar la solidaridad con quienes más lo necesitan.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
              icon={<Heart className="h-8 w-8 text-emerald-600" />}
              title="1. Donar"
              description="Restaurantes, comercios y particulares publican sus excedentes de comida fresca. Especifiquen cantidad, fecha de caducidad y ubicación."
            />
            <FeatureCard 
              icon={<MapPin className="h-8 w-8 text-blue-500" />}
              title="2. Conectar"
              description="Las ONGs locales exploran donaciones disponibles en su zona y reclaman las que necesitan para sus comedores sociales."
            />
            <FeatureCard 
              icon={<Truck className="h-8 w-8 text-orange-500" />}
              title="3. Entregar"
              description="Voluntarios coordinan con donantes y ONGs para recoger y entregar las donaciones, asegurando que lleguen frescas y a tiempo."
            />
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 bg-emerald-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Impacto Real</h2>
            <p className="text-gray-600">Cada donación cuenta para un mundo mejor</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-3xl font-bold text-emerald-600 mb-2">1/3</div>
              <p className="text-gray-700">de alimentos producidos se desperdician anualmente</p>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-emerald-600 mb-2">815M</div>
              <p className="text-gray-700">personas pasan hambre en el mundo</p>
            </div>
            <div className="p-6">
              <div className="text-3xl font-bold text-emerald-600 mb-2">10%</div>
              <p className="text-gray-700">reducción de emisiones CO2 por cada tonelada donada</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-emerald-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <Stat number="10k+" label="Comidas salvadas" />
            <Stat number="500+" label="Donantes activos" />
            <Stat number="200+" label="ONGs beneficiadas" />
            <Stat number="1k+" label="Voluntarios" />
          </div>
        </div>
      </section>
    </div>
  );
}

function BenefitCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="p-6 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-shadow">
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-lg transition-shadow text-center group">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function Stat({ number, label }: { number: string, label: string }) {
  return (
    <div>
      <div className="text-4xl md:text-5xl font-bold text-emerald-400 mb-2">{number}</div>
      <div className="text-emerald-100/80 font-medium">{label}</div>
    </div>
  );
}
