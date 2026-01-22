import Image from 'next/image';
import Link from 'next/link';

interface PermisoCardProps {
  id: string;
  nombre: string;
  subtitulo: string;
  descripcion: string;
  imagen: string;
  destacado?: boolean;
}

export default function PermisoCard({
  id,
  nombre,
  subtitulo,
  descripcion,
  imagen,
  destacado = false,
}: PermisoCardProps) {
  return (
    <Link href={`/permisos/${id}`}>
      <div className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${destacado ? 'ring-2 ring-primary' : ''}`}>
        {destacado && (
          <div className="bg-primary text-white text-xs font-semibold px-3 py-1 text-center">
            Popular
          </div>
        )}
        <div className="relative h-48">
          <Image
            src={imagen}
            alt={nombre}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-5">
          <h3 className="text-xl font-bold text-gray-900">{nombre}</h3>
          <p className="text-primary font-medium text-sm mb-2">{subtitulo}</p>
          <p className="text-gray-600 text-sm line-clamp-2">{descripcion}</p>
          <div className="mt-4 flex items-center text-primary font-medium text-sm">
            Ver detalles
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
