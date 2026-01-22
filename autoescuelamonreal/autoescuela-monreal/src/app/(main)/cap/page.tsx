import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curso CAP en Zaragoza | Autoescuela Monreal',
  description: 'Obtén tu Certificado de Aptitud Profesional (CAP) en Zaragoza. CAP inicial y continuo para transporte de mercancías y viajeros. Formación de calidad con los mejores profesionales.',
};

const tiposCurso = [
  {
    titulo: 'CAP Inicial',
    duracion: '140 horas',
    descripcion: 'Para nuevos conductores profesionales que quieran dedicarse al transporte de mercancías o viajeros por primera vez.',
    caracteristicas: [
      'Formación teórica y práctica completa',
      'Válido para mercancías y viajeros',
      'Obligatorio para nuevos conductores profesionales',
      'Examen final en la DGT'
    ]
  },
  {
    titulo: 'CAP Continuo',
    duracion: '35 horas cada 5 años',
    descripcion: 'Formación de reciclaje obligatoria para mantener la cualificación profesional activa.',
    caracteristicas: [
      'Renovación cada 5 años',
      'Actualización de conocimientos',
      'Nuevas normativas y tecnologías',
      'Sin examen final'
    ]
  }
];

const modalidades = [
  {
    nombre: 'Mercancías',
    icono: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20" />
      </svg>
    ),
    descripcion: 'Para conductores de vehículos de transporte de mercancías que requieran permisos C1, C, C1+E o C+E.'
  },
  {
    nombre: 'Viajeros',
    icono: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    descripcion: 'Para conductores de vehículos de transporte de viajeros que requieran permisos D1, D, D1+E o D+E.'
  }
];

export default function CAPPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Curso CAP en Zaragoza
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8">
              Certificado de Aptitud Profesional obligatorio para conductores profesionales de transporte de mercancías y viajeros.
            </p>
            <Link
              href="/contacto"
              className="inline-block bg-white text-primary font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Solicitar informacion
            </Link>
          </div>
        </div>
      </section>

      {/* Que es el CAP */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            ¿Que es el CAP?
          </h2>
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="mb-4">
              El <strong>Certificado de Aptitud Profesional (CAP)</strong> es una acreditación obligatoria para todos los conductores profesionales que se dediquen al transporte de mercancías o viajeros por carretera en la Unión Europea.
            </p>
            <p className="mb-4">
              Esta certificación garantiza que los conductores profesionales tienen los conocimientos necesarios sobre seguridad vial, normativa de transporte, conducción racional y eficiente, y primeros auxilios.
            </p>
            <p>
              En Autoescuela Monreal te preparamos para obtener tu CAP con la mejor formación y los profesionales más cualificados de Zaragoza.
            </p>
          </div>
        </div>
      </section>

      {/* Tipos de CAP */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Tipos de cursos CAP
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {tiposCurso.map((tipo) => (
              <div key={tipo.titulo} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{tipo.titulo}</h3>
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {tipo.duracion}
                  </span>
                </div>
                <p className="text-gray-600 mb-6">{tipo.descripcion}</p>
                <ul className="space-y-3">
                  {tipo.caracteristicas.map((caracteristica, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{caracteristica}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modalidades */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Modalidades
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {modalidades.map((modalidad) => (
              <div key={modalidad.nombre} className="bg-white rounded-xl p-8 shadow-lg text-center">
                <div className="text-primary mb-4 flex justify-center">
                  {modalidad.icono}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{modalidad.nombre}</h3>
                <p className="text-gray-600">{modalidad.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requisitos */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Requisitos para obtener el CAP
          </h2>
          <div className="bg-gray-50 rounded-xl p-8">
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Permiso de conducir</h4>
                  <p className="text-gray-600">Estar en posesión del permiso de conducir correspondiente (C, C+E, D o D+E) o estar en proceso de obtenerlo.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Curso de formación</h4>
                  <p className="text-gray-600">Completar el curso de formación inicial (140 horas) o continua (35 horas) en un centro autorizado.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Examen teórico (solo CAP inicial)</h4>
                  <p className="text-gray-600">Superar el examen teórico en la Jefatura Provincial de Tráfico.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Por que elegirnos */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            ¿Por que elegir Autoescuela Monreal?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { titulo: 'Profesores expertos', descripcion: 'Formadores con amplia experiencia en el sector del transporte profesional.' },
              { titulo: 'Horarios flexibles', descripcion: 'Adaptamos los horarios a tus necesidades laborales y personales.' },
              { titulo: 'Alto porcentaje de aprobados', descripcion: 'Nuestros alumnos obtienen excelentes resultados en los examenes.' },
              { titulo: 'Material actualizado', descripcion: 'Contenidos siempre al dia con la normativa vigente.' },
              { titulo: 'Dos centros en Zaragoza', descripcion: 'Elige el centro que mejor se adapte a tu ubicación.' },
              { titulo: 'Atencion personalizada', descripcion: 'Te acompañamos durante todo el proceso de formación.' },
            ].map((item) => (
              <div key={item.titulo} className="bg-white rounded-lg p-6 shadow-md">
                <h3 className="font-semibold text-gray-900 mb-2">{item.titulo}</h3>
                <p className="text-gray-600 text-sm">{item.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para obtener tu CAP?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Contacta con nosotros y te informamos sin compromiso sobre fechas, horarios y precios.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contacto"
              className="inline-block bg-white text-primary font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Contactar
            </Link>
            <a
              href="tel:976251719"
              className="inline-block border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-primary transition-colors"
            >
              Llamar: 976 251 719
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
