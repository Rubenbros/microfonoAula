'use client';

import { useState } from 'react';
import Link from 'next/link';

const permisos = [
  { value: '', label: 'Selecciona un permiso (opcional)' },
  { value: 'am', label: 'Permiso AM - Ciclomotor' },
  { value: 'a1', label: 'Permiso A1 - Moto 125cc' },
  { value: 'a2', label: 'Permiso A2 - Moto hasta 35kW' },
  { value: 'a', label: 'Permiso A - Todas las motos' },
  { value: 'b', label: 'Permiso B - Coche' },
  { value: 'be', label: 'Permiso B+E - Coche con remolque' },
  { value: 'c1', label: 'Permiso C1 - Camion mediano' },
  { value: 'c', label: 'Permiso C - Camion' },
  { value: 'ce', label: 'Permiso C+E - Camion con remolque' },
  { value: 'd1', label: 'Permiso D1 - Minibus' },
  { value: 'd', label: 'Permiso D - Autobus' },
  { value: 'cap', label: 'Curso CAP' },
  { value: 'adr', label: 'Curso ADR - Mercancias peligrosas' },
  { value: 'otro', label: 'Otro / Consulta general' },
];

export default function ContactForm() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    permiso: '',
    mensaje: '',
    privacidad: false,
  });

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // Crear el cuerpo del email
    const permisoSeleccionado = permisos.find(p => p.value === formData.permiso)?.label || 'No especificado';
    const subject = `Consulta web - ${formData.nombre}`;
    const body = `
Nombre: ${formData.nombre}
Email: ${formData.email}
Telefono: ${formData.telefono || 'No proporcionado'}
Permiso de interes: ${permisoSeleccionado}

Mensaje:
${formData.mensaje}
    `.trim();

    // Usar mailto como solucion simple
    const mailtoLink = `mailto:autoescuelamonreal@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Abrir cliente de email
    window.location.href = mailtoLink;

    // Mostrar mensaje de exito
    setTimeout(() => {
      setStatus('success');
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        permiso: '',
        mensaje: '',
        privacidad: false,
      });
    }, 500);
  };

  if (status === 'success') {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Mensaje preparado!</h3>
        <p className="text-gray-600 mb-6">
          Se ha abierto tu cliente de email con el mensaje. Si no se ha abierto automaticamente,
          puedes escribirnos directamente a <a href="mailto:autoescuelamonreal@gmail.com" className="text-primary hover:underline">autoescuelamonreal@gmail.com</a>
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
            Nombre completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            required
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="Tu nombre"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="tu@email.com"
          />
        </div>

        {/* Telefono */}
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-2">
            Telefono
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
            placeholder="Tu telefono (opcional)"
          />
        </div>

        {/* Permiso */}
        <div>
          <label htmlFor="permiso" className="block text-sm font-medium text-gray-700 mb-2">
            Permiso de interes
          </label>
          <select
            id="permiso"
            name="permiso"
            value={formData.permiso}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors bg-white"
          >
            {permisos.map((permiso) => (
              <option key={permiso.value} value={permiso.value}>
                {permiso.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mensaje */}
      <div className="mt-6">
        <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-2">
          Mensaje <span className="text-red-500">*</span>
        </label>
        <textarea
          id="mensaje"
          name="mensaje"
          required
          rows={5}
          value={formData.mensaje}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-colors resize-none"
          placeholder="¿En que podemos ayudarte?"
        />
      </div>

      {/* Privacidad */}
      <div className="mt-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="privacidad"
            required
            checked={formData.privacidad}
            onChange={handleChange}
            className="mt-1 w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <span className="text-sm text-gray-600">
            He leido y acepto la{' '}
            <Link href="/politica-privacidad" className="text-primary hover:underline">
              politica de privacidad
            </Link>{' '}
            y autorizo el tratamiento de mis datos para gestionar mi consulta.
            <span className="text-red-500"> *</span>
          </span>
        </label>
      </div>

      {/* Boton enviar */}
      <div className="mt-8">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {status === 'sending' ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Enviar mensaje
            </>
          )}
        </button>
      </div>

      {status === 'error' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          Ha ocurrido un error al enviar el mensaje. Por favor, intentalo de nuevo o contactanos directamente por telefono.
        </div>
      )}
    </form>
  );
}
