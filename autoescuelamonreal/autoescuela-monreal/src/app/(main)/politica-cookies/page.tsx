import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politica de Cookies | Autoescuela Monreal',
  description: 'Informacion sobre el uso de cookies en Autoescuela Monreal. Conoce que cookies utilizamos y como gestionarlas.',
};

export default function PoliticaCookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Politica de Cookies</h1>

        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">¿Que son las cookies?</h2>
            <p className="text-gray-600">
              Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (ordenador, tablet o movil)
              cuando visitas un sitio web. Permiten que el sitio recuerde tus acciones y preferencias durante un periodo
              de tiempo, para que no tengas que volver a introducirlas cada vez que vuelvas al sitio o navegues de una
              pagina a otra.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">¿Que tipos de cookies utilizamos?</h2>

            <div className="space-y-6">
              <div className="border-l-4 border-primary pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Cookies necesarias</h3>
                <p className="text-gray-600 text-sm">
                  Son esenciales para el funcionamiento del sitio web. Incluyen cookies que permiten recordar
                  tu consentimiento de cookies y otras funcionalidades basicas. No se pueden desactivar.
                </p>
              </div>

              <div className="border-l-4 border-blue-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Cookies de analisis</h3>
                <p className="text-gray-600 text-sm">
                  Nos permiten reconocer y contar el numero de visitantes, y ver como se mueven por el sitio
                  cuando lo usan. Esto nos ayuda a mejorar la forma en que funciona nuestro sitio web,
                  asegurandonos de que los usuarios encuentren facilmente lo que buscan.
                </p>
              </div>

              <div className="border-l-4 border-yellow-400 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">Cookies de marketing</h3>
                <p className="text-gray-600 text-sm">
                  Se utilizan para rastrear a los visitantes en los sitios web. La intencion es mostrar
                  anuncios que sean relevantes y atractivos para el usuario individual, y por lo tanto
                  mas valiosos para los editores y anunciantes externos.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">¿Como gestionar las cookies?</h2>
            <p className="text-gray-600 mb-4">
              Puedes configurar tu navegador para bloquear o alertarte sobre estas cookies, pero algunas
              partes del sitio podrian no funcionar correctamente. Tambien puedes cambiar tus preferencias
              de cookies en cualquier momento haciendo clic en el boton de configuracion de cookies.
            </p>
            <p className="text-gray-600">
              Para mas informacion sobre como gestionar las cookies en tu navegador, visita la seccion
              de ayuda de tu navegador o consulta los siguientes enlaces:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/es/kb/cookies-informacion-que-los-sitios-web-guardan-en-" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies de terceros</h2>
            <p className="text-gray-600">
              En algunos casos utilizamos cookies de terceros de confianza. La siguiente seccion detalla
              que cookies de terceros podrias encontrar a traves de este sitio:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600 list-disc list-inside">
              <li>Google Analytics: para analizar el uso del sitio web</li>
              <li>Google Maps: para mostrar mapas interactivos de nuestras sedes</li>
              <li>YouTube: para incrustar videos de formacion teorica</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Actualizaciones de esta politica</h2>
            <p className="text-gray-600">
              Podemos actualizar esta politica de cookies periodicamente. Te recomendamos revisar esta
              pagina con regularidad para estar informado sobre como usamos las cookies.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              Ultima actualizacion: Enero 2024
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contacto</h2>
            <p className="text-gray-600">
              Si tienes alguna pregunta sobre nuestra politica de cookies, puedes contactarnos en:
            </p>
            <ul className="mt-4 space-y-2 text-gray-600">
              <li><strong>Email:</strong> autoescuelamonreal@gmail.com</li>
              <li><strong>Telefono:</strong> 976 251 719</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
