import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import content from '@/data/content.json';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return content.permisos.map((permiso) => ({
    id: permiso.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const permiso = content.permisos.find((p) => p.id === id);

  if (!permiso) {
    return {
      title: 'Permiso no encontrado',
    };
  }

  return {
    title: `${permiso.nombre} - ${permiso.subtitulo} | Autoescuela Monreal`,
    description: permiso.descripcion,
  };
}

export default async function PermisoPage({ params }: Props) {
  const { id } = await params;
  const { permisos, sitio } = content;
  const permiso = permisos.find((p) => p.id === id);

  if (!permiso) {
    notFound();
  }

  const permisosRelacionados = permisos
    .filter((p) => p.categoria === permiso.categoria && p.id !== permiso.id)
    .slice(0, 3);

  return (
    <>
      {/* Header con imagen */}
      <section className="relative bg-gray-900 text-white">
        <div className="absolute inset-0">
          <Image
            src={permiso.imagen}
            alt={permiso.nombre}
            fill
            className="object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Link
            href="/permisos"
            className="inline-flex items-center text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a permisos
          </Link>
          <div className="max-w-3xl">
            <span className="inline-block bg-primary text-white text-sm font-semibold px-3 py-1 rounded-full mb-4">
              {permiso.subtitulo}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{permiso.nombre}</h1>
            <p className="text-xl text-gray-300">{permiso.descripcion}</p>
          </div>
        </div>
      </section>

      {/* Contenido */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Informacion principal */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Requisitos</h2>
                <ul className="space-y-4">
                  {permiso.requisitos.map((requisito, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{requisito}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Edad minima</h2>
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-gray-900">{permiso.edad}</p>
                    <p className="text-gray-600">para obtener este permiso</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-primary text-white rounded-xl p-8 sticky top-24">
                <h3 className="text-xl font-bold mb-4">¿Te interesa este permiso?</h3>
                <p className="text-white/80 mb-6">
                  Contacta con nosotros y te informamos sobre precios, horarios y disponibilidad.
                </p>
                <a
                  href={`tel:${sitio.telefono.replace(/\s/g, '')}`}
                  className="w-full bg-white text-primary hover:bg-gray-100 font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center mb-4"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {sitio.telefono}
                </a>
                <Link
                  href="/contacto"
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center border border-white/30"
                >
                  Ver todas las formas de contacto
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Permisos relacionados */}
      {permisosRelacionados.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Otros permisos relacionados</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {permisosRelacionados.map((p) => (
                <Link key={p.id} href={`/permisos/${p.id}`}>
                  <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <h3 className="text-xl font-bold text-gray-900">{p.nombre}</h3>
                    <p className="text-primary font-medium text-sm mb-2">{p.subtitulo}</p>
                    <p className="text-gray-600 text-sm">{p.descripcion}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
