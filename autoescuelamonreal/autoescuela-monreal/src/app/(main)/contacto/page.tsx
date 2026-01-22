import { Metadata } from 'next';
import content from '@/data/content.json';
import ContactForm from '@/components/ContactForm';

export const metadata: Metadata = {
  title: 'Contacto | Autoescuela Monreal Zaragoza',
  description: 'Contacta con Autoescuela Monreal en Zaragoza. Dos sedes en La Paz y Rosales. Telefono, email y direccion.',
};

export default function ContactoPage() {
  const { sitio, sedes } = content;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Contacto
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl">
            Estamos aqui para ayudarte. Contacta con nosotros por telefono, email o visitanos en cualquiera de nuestras sedes.
          </p>
        </div>
      </section>

      {/* Informacion de contacto */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            {/* Telefono */}
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Telefono</h3>
              <a
                href={`tel:${sitio.telefono.replace(/\s/g, '')}`}
                className="text-2xl font-bold text-primary hover:text-primary-dark transition-colors"
              >
                {sitio.telefono}
              </a>
              <p className="text-gray-600 mt-2">Llamanos para cualquier consulta</p>
            </div>

            {/* Email */}
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
              <a
                href={`mailto:${sitio.email}`}
                className="text-xl font-bold text-primary hover:text-primary-dark transition-colors break-all"
              >
                {sitio.email}
              </a>
              <p className="text-gray-600 mt-2">Escribenos y te respondemos</p>
            </div>

            {/* Horario */}
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Horario</h3>
              <p className="text-lg font-semibold text-gray-700">{sitio.horario}</p>
              <p className="text-gray-600 mt-2">Horario de atencion al publico</p>
            </div>
          </div>

          {/* Sedes */}
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Nuestras sedes
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {sedes.map((sede) => (
              <div key={sede.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Google Maps Embed */}
                <div className="h-64">
                  <iframe
                    src={sede.googleMapsEmbed}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Mapa de ${sede.nombre}`}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{sede.nombre}</h3>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Direccion</p>
                        <p className="text-gray-600">{sede.direccion}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <div>
                        <p className="font-medium text-gray-900">Telefono</p>
                        <a href={`tel:${sede.telefono.replace(/\s/g, '')}`} className="text-primary hover:text-primary-dark">
                          {sede.telefono}
                        </a>
                      </div>
                    </div>

                    {sede.whatsapp && (
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">WhatsApp</p>
                          <a
                            href={`https://wa.me/34${sede.whatsapp.replace(/\s/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-700"
                          >
                            {sede.whatsapp}
                          </a>
                        </div>
                      </div>
                    )}

                    {sede.horario && (
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Horario</p>
                          <p className="text-gray-600 text-sm">{sede.horario}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <a
                    href={sede.googleMaps}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Como llegar
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formulario de contacto */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Envianos un mensaje
            </h2>
            <p className="text-lg text-gray-600">
              Rellena el formulario y te contactaremos lo antes posible.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </>
  );
}
