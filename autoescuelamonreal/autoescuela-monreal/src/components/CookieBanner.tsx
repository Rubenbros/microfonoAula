'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type CookieConsent = 'all' | 'necessary' | null;

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', 'all');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('cookieConsent', 'necessary');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900/95 backdrop-blur-sm text-white p-4 md:p-6 shadow-lg">
      <div className="max-w-7xl mx-auto">
        {!showConfig ? (
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Utilizamos cookies</h3>
              <p className="text-gray-300 text-sm">
                Usamos cookies propias y de terceros para mejorar tu experiencia de navegacion, analizar el trafico y personalizar el contenido.
                Puedes aceptar todas las cookies, solo las necesarias o configurar tus preferencias.{' '}
                <Link href="/politica-cookies" className="text-primary hover:underline">
                  Mas informacion
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => setShowConfig(true)}
                className="px-5 py-2.5 text-sm font-medium border border-gray-500 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Configurar
              </button>
              <button
                onClick={handleAcceptNecessary}
                className="px-5 py-2.5 text-sm font-medium border border-gray-500 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Solo necesarias
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 text-sm font-medium bg-primary hover:bg-primary-dark rounded-lg transition-colors"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Configurar cookies</h3>
              <button
                onClick={() => setShowConfig(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Cerrar configuracion"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium">Cookies necesarias</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Esenciales para el funcionamiento del sitio web. No se pueden desactivar.
                  </p>
                </div>
                <div className="bg-primary px-3 py-1 rounded text-sm">Activas</div>
              </div>

              <div className="flex items-start justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium">Cookies de analisis</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Nos permiten medir el trafico y analizar tu comportamiento para mejorar el servicio.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="flex items-start justify-between p-4 bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium">Cookies de marketing</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Utilizadas para mostrarte anuncios relevantes y medir la efectividad de las campanas.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleAcceptNecessary}
                className="px-5 py-2.5 text-sm font-medium border border-gray-500 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Solo necesarias
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-5 py-2.5 text-sm font-medium bg-primary hover:bg-primary-dark rounded-lg transition-colors"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
