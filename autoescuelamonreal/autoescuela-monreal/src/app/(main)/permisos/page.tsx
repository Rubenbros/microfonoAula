import { Metadata } from 'next';
import PermisoCard from '@/components/PermisoCard';
import content from '@/data/content.json';

export const metadata: Metadata = {
  title: 'Todos los Permisos de Conducir | Autoescuela Monreal',
  description: 'Obtén cualquier permiso de conducir en Zaragoza: B, A1, A2, A, C, D, CAP, ADR y más. Formación profesional y personalizada.',
};

export default function PermisosPage() {
  const { permisos } = content;

  const categorias = [
    { id: 'coches', nombre: 'Coches', descripcion: 'Permisos para turismos y vehículos ligeros' },
    { id: 'motos', nombre: 'Motos', descripcion: 'Permisos para motocicletas y ciclomotores' },
    { id: 'camiones', nombre: 'Camiones', descripcion: 'Permisos para vehículos de transporte de mercancías' },
    { id: 'autobuses', nombre: 'Autobuses', descripcion: 'Permisos para transporte de pasajeros' },
    { id: 'profesional', nombre: 'Profesional', descripcion: 'Certificaciones y autorizaciones profesionales' },
  ];

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Todos los permisos de conducir
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            En Autoescuela Monreal te preparamos para obtener cualquier permiso de conducir.
            Elige el tuyo y empieza tu formación.
          </p>
        </div>
      </section>

      {/* Categorias y permisos */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {categorias.map((categoria) => {
            const permisosCategoria = permisos.filter(p => p.categoria === categoria.id);
            if (permisosCategoria.length === 0) return null;

            return (
              <div key={categoria.id} className="mb-16 last:mb-0">
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {categoria.nombre}
                  </h2>
                  <p className="text-gray-600">{categoria.descripcion}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {permisosCategoria.map((permiso) => (
                    <PermisoCard
                      key={permiso.id}
                      id={permiso.id}
                      nombre={permiso.nombre}
                      subtitulo={permiso.subtitulo}
                      descripcion={permiso.descripcion}
                      imagen={permiso.imagen}
                      destacado={permiso.destacado}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            ¿No sabes qué permiso necesitas?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Contacta con nosotros y te asesoraremos sin compromiso sobre el permiso más adecuado para ti.
          </p>
          <a
            href="/contacto"
            className="inline-flex items-center bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-8 rounded-lg transition-colors"
          >
            Contactar
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
