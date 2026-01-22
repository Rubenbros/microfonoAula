import content from "@/data/content.json";

export const metadata = {
  title: "Teórica Online | Autoescuela Monreal",
  description: "Videos explicativos de todos los temas del carnet de conducir. Aprende la teórica desde casa con nuestros videos.",
};

export default function TeoricaPage() {
  const { teorica } = content;

  return (
    <div className="py-12">
      {/* Header */}
      <div className="bg-blue-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">{teorica.titulo}</h1>
          <p className="text-xl text-blue-200 max-w-3xl mx-auto">
            {teorica.descripcion}
          </p>
        </div>
      </div>

      {/* Método de estudio */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
            Método de estudio recomendado
          </h2>
          <div className="max-w-3xl mx-auto">
            <ol className="space-y-4">
              {teorica.metodo.map((paso, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 pt-1">{paso}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Videos */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
            Videos por temas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {teorica.videos.map((video, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtube}`}
                    title={`${video.tema}: ${video.titulo}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="p-4">
                  <span className="text-sm font-semibold text-blue-600">{video.tema}</span>
                  <h3 className="text-lg font-bold text-gray-800">{video.titulo}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Test Online */}
      <section className="py-12 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Test Online</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Practica con tests de examen reales y comprueba tu nivel antes de presentarte al examen oficial de la DGT.
              </p>
              <div className="bg-green-50 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-800 mb-3">Ventajas de practicar online:</h3>
                <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tests actualizados con preguntas reales de la DGT
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Practica desde cualquier dispositivo
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Resultados inmediatos con explicaciones
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Simula el examen oficial de 30 preguntas
                  </li>
                </ul>
              </div>
              <a
                href="https://www.testdelautoescuela.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-lg transition-colors text-lg"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Hacer test online
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Enlace a resultados DGT */}
      <section className="py-12 bg-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Consulta tus resultados</h2>
          <p className="text-blue-200 mb-6">
            Accede al portal de la DGT para ver el resultado de tu examen teórico o práctico
          </p>
          <a
            href={teorica.enlaceResultados}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Ver resultados de exámenes
          </a>
        </div>
      </section>
    </div>
  );
}
