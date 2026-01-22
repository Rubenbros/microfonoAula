import { Metadata } from 'next';
import Image from 'next/image';
import SedeCard from '@/components/SedeCard';
import content from '@/data/content.json';

export const metadata: Metadata = {
  title: 'Sobre Nosotros | Autoescuela Monreal Zaragoza',
  description: 'Conoce Autoescuela Monreal, tu autoescuela de confianza en Zaragoza. Dos sedes en La Paz y Rosales con profesionales experimentados.',
};

export default function NosotrosPage() {
  const { sitio, sedes } = content;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Sobre Autoescuela Monreal
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Tu autoescuela de confianza en Zaragoza desde hace mas de 30 años.
          </p>
        </div>
      </section>

      {/* Historia y valores */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Formando conductores profesionales
              </h2>
              <div className="space-y-4 text-gray-600">
                <p>
                  En Autoescuela Monreal llevamos mas de tres decadas dedicados a la formacion
                  de conductores en Zaragoza. Nuestra experiencia y profesionalidad nos han
                  convertido en una referencia en el sector.
                </p>
                <p>
                  Contamos con un equipo de profesores titulados y con amplia experiencia,
                  que se dedican a garantizar que cada alumno obtenga su permiso de conducir
                  con los conocimientos y habilidades necesarios para circular con seguridad.
                </p>
                <p>
                  Ofrecemos formacion para todos los permisos de conducir, desde el carnet B
                  hasta permisos profesionales como el CAP y ADR, adaptandonos siempre a las
                  necesidades de cada alumno.
                </p>
              </div>
            </div>
            <div className="relative">
              <Image
                src="/images/logo.png"
                alt="Autoescuela Monreal"
                width={500}
                height={300}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Nuestros valores
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Seguridad</h3>
              <p className="text-gray-600 text-sm">
                La seguridad vial es nuestra prioridad en cada clase.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Formacion</h3>
              <p className="text-gray-600 text-sm">
                Ensenanza de calidad con metodos actualizados.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Cercania</h3>
              <p className="text-gray-600 text-sm">
                Trato personalizado y adaptado a cada alumno.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Eficacia</h3>
              <p className="text-gray-600 text-sm">
                Altos indices de aprobados en primera convocatoria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sedes */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Nuestras sedes
          </h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Dos centros de formacion en Zaragoza para estar mas cerca de ti.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {sedes.map((sede) => (
              <SedeCard
                key={sede.id}
                nombre={sede.nombre}
                direccion={sede.direccion}
                telefono={sede.telefono}
                imagen={sede.imagen}
                googleMaps={sede.googleMaps}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Contacta con nosotros y te asesoramos sobre el permiso que necesitas.
          </p>
          <a
            href="/contacto"
            className="inline-flex items-center bg-white text-primary hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-colors"
          >
            Contactar ahora
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </section>
    </>
  );
}
