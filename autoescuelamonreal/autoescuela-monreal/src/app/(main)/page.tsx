import Image from 'next/image';
import Link from 'next/link';
import PermisoCard from '@/components/PermisoCard';
import SedeCard from '@/components/SedeCard';
import content from '@/data/content.json';

export default function Home() {
  const { sitio, sedes, permisos, home } = content;
  const permisosDestacados = permisos.filter(p => p.destacado);

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[url('/images/pattern.svg')] bg-repeat"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                {home.heroTitulo}
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8">
                {home.heroSubtitulo}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/permisos"
                  className="bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-8 rounded-lg transition-colors text-center"
                >
                  {home.heroBoton}
                </Link>
                <Link
                  href="/contacto"
                  className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-lg transition-colors text-center border border-white/20"
                >
                  Contactar
                </Link>
              </div>
            </div>
            <div className="hidden md:flex justify-center">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
                <Image
                  src="/images/logo.png"
                  alt={sitio.nombre}
                  width={400}
                  height={200}
                  className="w-auto h-auto max-w-md"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Permisos destacados */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {home.seccionPermisos.titulo}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {home.seccionPermisos.subtitulo}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {permisosDestacados.map((permiso) => (
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

          <div className="text-center mt-10">
            <Link
              href="/permisos"
              className="inline-flex items-center text-primary hover:text-primary-dark font-semibold text-lg"
            >
              Ver todos los permisos
              <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Por que elegirnos */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que elegirnos
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Experiencia</h3>
              <p className="text-gray-600">
                Mas de 30 anos formando conductores profesionales en Zaragoza con los mejores resultados.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Profesionales</h3>
              <p className="text-gray-600">
                Equipo de profesores titulados y con amplia experiencia para garantizar tu aprendizaje.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Dos sedes</h3>
              <p className="text-gray-600">
                Dos centros de formacion en Zaragoza para estar mas cerca de ti: La Paz y Rosales.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Teórica y Test Online */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Aprende desde casa
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Prepara tu examen teórico con nuestros recursos online
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Teórica Online */}
            <Link href="/teorica" className="group">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">Teórica Online</h3>
                <p className="text-blue-100 mb-4">
                  Videos explicativos de todos los temas del carnet. Aprende a tu ritmo con nuestros contenidos.
                </p>
                <span className="inline-flex items-center text-white font-semibold group-hover:underline">
                  Ver videos
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </Link>

            {/* Test Online */}
            <a href="https://www.testdelautoescuela.com/" target="_blank" rel="noopener noreferrer" className="group">
              <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl p-8 text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">Test Online</h3>
                <p className="text-amber-100 mb-4">
                  Practica con test de examen reales. Prepárate para aprobar a la primera.
                </p>
                <span className="inline-flex items-center text-white font-semibold group-hover:underline">
                  Hacer test
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Sedes */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {home.seccionSedes.titulo}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {home.seccionSedes.subtitulo}
            </p>
          </div>

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

      {/* CTA Contacto */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {home.seccionContacto.titulo}
          </h2>
          <p className="text-xl text-white/80 mb-8">
            {home.seccionContacto.subtitulo}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={`tel:${sitio.telefono.replace(/\s/g, '')}`}
              className="bg-white text-primary hover:bg-gray-100 font-semibold py-4 px-8 rounded-lg transition-colors inline-flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {sitio.telefono}
            </a>
            <Link
              href="/contacto"
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-8 rounded-lg transition-colors border border-white/30"
            >
              Ver datos de contacto
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
