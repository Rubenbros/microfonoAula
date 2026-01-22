import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Curso ADR en Zaragoza - Mercancias Peligrosas | Autoescuela Monreal',
  description: 'Obtén tu autorización ADR para transporte de mercancías peligrosas en Zaragoza. Cursos de ADR básico, cisternas, explosivos y radiactivos. Centro autorizado.',
};

const especialidades = [
  {
    titulo: 'ADR Básico',
    duracion: '18 horas',
    descripcion: 'Formación básica obligatoria para el transporte de mercancías peligrosas en bultos.',
    incluye: [
      'Normativa general ADR',
      'Clasificación de mercancías peligrosas',
      'Etiquetado y señalización',
      'Documentación de transporte',
      'Actuación en caso de accidente'
    ]
  },
  {
    titulo: 'ADR Cisternas',
    duracion: '12 horas adicionales',
    descripcion: 'Especialización para el transporte de mercancías peligrosas en cisternas.',
    incluye: [
      'Tipos de cisternas y equipamientos',
      'Operaciones de carga y descarga',
      'Mantenimiento y verificaciones',
      'Conducción de vehículos cisterna',
      'Emergencias específicas'
    ]
  },
  {
    titulo: 'ADR Explosivos',
    duracion: '8 horas adicionales',
    descripcion: 'Especialización para el transporte de explosivos (Clase 1).',
    incluye: [
      'Clasificación de explosivos',
      'Compatibilidad de carga',
      'Cantidades máximas',
      'Rutas y restricciones',
      'Medidas de seguridad específicas'
    ]
  },
  {
    titulo: 'ADR Radiactivos',
    duracion: '8 horas adicionales',
    descripcion: 'Especialización para el transporte de materiales radiactivos (Clase 7).',
    incluye: [
      'Tipos de materiales radiactivos',
      'Índices de transporte',
      'Protección radiológica',
      'Embalajes especiales',
      'Procedimientos de emergencia'
    ]
  }
];

export default function ADRPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-secondary to-secondary-dark text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Curso ADR en Zaragoza
            </h1>
            <p className="text-xl md:text-2xl text-red-100 mb-8">
              Autorización especial para el transporte de mercancías peligrosas por carretera. Todas las especialidades disponibles.
            </p>
            <Link
              href="/contacto"
              className="inline-block bg-white text-secondary font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Solicitar informacion
            </Link>
          </div>
        </div>
      </section>

      {/* Que es el ADR */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            ¿Que es el ADR?
          </h2>
          <div className="prose prose-lg max-w-none text-gray-600">
            <p className="mb-4">
              El <strong>ADR (Acuerdo Europeo sobre Transporte Internacional de Mercancías Peligrosas por Carretera)</strong> es la autorización especial que necesitan los conductores para transportar mercancías peligrosas.
            </p>
            <p className="mb-4">
              Esta certificación es obligatoria para conducir vehículos que transporten sustancias peligrosas como productos químicos, combustibles, gases, explosivos o materiales radiactivos.
            </p>
            <p>
              En Autoescuela Monreal somos centro autorizado para impartir todos los cursos ADR. Te preparamos con la mejor formación teórica y práctica para que obtengas tu autorización con garantías.
            </p>
          </div>
        </div>
      </section>

      {/* Especialidades */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Especialidades ADR
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {especialidades.map((esp) => (
              <div key={esp.titulo} className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-900">{esp.titulo}</h3>
                  <span className="bg-secondary text-white px-4 py-1 rounded-full text-sm font-semibold">
                    {esp.duracion}
                  </span>
                </div>
                <p className="text-gray-600 mb-6">{esp.descripcion}</p>
                <h4 className="font-semibold text-gray-900 mb-3">El curso incluye:</h4>
                <ul className="space-y-2">
                  {esp.incluye.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requisitos */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Requisitos para obtener el ADR
          </h2>
          <div className="bg-white rounded-xl p-8 shadow-lg">
            <ul className="space-y-4">
              <li className="flex items-start gap-4">
                <div className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Edad mínima</h4>
                  <p className="text-gray-600">Tener al menos 21 años cumplidos.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Permiso de conducir</h4>
                  <p className="text-gray-600">Estar en posesión del permiso de conducir de la clase B como mínimo.</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Curso de formación</h4>
                  <p className="text-gray-600">Completar el curso de formación ADR en un centro autorizado (entre 18 y 24 horas según especialidad).</p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-secondary text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold">4</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Examen teórico</h4>
                  <p className="text-gray-600">Superar el examen teórico en la Jefatura Provincial de Tráfico.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Validez y renovacion */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Validez de la autorización
              </h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-600 mb-4">
                  La autorización ADR tiene una validez de <strong>5 años</strong> desde la fecha de expedición.
                </p>
                <p className="text-gray-600">
                  Para renovarla, debes realizar un curso de reciclaje y superar el examen correspondiente antes de que caduque.
                </p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Renovación
              </h2>
              <div className="bg-gray-50 rounded-xl p-6">
                <p className="text-gray-600 mb-4">
                  El curso de renovación tiene una duración más corta que el inicial y se centra en actualizar los conocimientos.
                </p>
                <p className="text-gray-600">
                  Te recomendamos iniciar el proceso de renovación con al menos 3 meses de antelación a la fecha de caducidad.
                </p>
              </div>
            </div>
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
              { titulo: 'Centro autorizado', descripcion: 'Somos centro oficial autorizado para impartir cursos ADR.' },
              { titulo: 'Todas las especialidades', descripcion: 'Ofrecemos formación en ADR básico, cisternas, explosivos y radiactivos.' },
              { titulo: 'Formadores especializados', descripcion: 'Profesores con experiencia en el sector del transporte de mercancías peligrosas.' },
              { titulo: 'Material didáctico incluido', descripcion: 'Todo el material necesario para tu formación está incluido en el curso.' },
              { titulo: 'Excelentes resultados', descripcion: 'Alto porcentaje de aprobados en los exámenes de la DGT.' },
              { titulo: 'Horarios adaptados', descripcion: 'Organizamos los cursos para adaptarnos a tu disponibilidad.' },
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
      <section className="py-16 bg-secondary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            ¿Listo para obtener tu ADR?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Contacta con nosotros y te informamos sin compromiso sobre fechas, horarios y precios de todas las especialidades.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contacto"
              className="inline-block bg-white text-secondary font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Contactar
            </Link>
            <a
              href="tel:976251719"
              className="inline-block border-2 border-white text-white font-semibold py-3 px-8 rounded-lg hover:bg-white hover:text-secondary transition-colors"
            >
              Llamar: 976 251 719
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
