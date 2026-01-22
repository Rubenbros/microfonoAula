'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Content {
  sitio: {
    nombre: string;
    slogan: string;
    descripcion: string;
    telefono: string;
    email: string;
    horario: string;
  };
  sedes: Array<{
    id: string;
    nombre: string;
    direccion: string;
    telefono: string;
    imagen: string;
    googleMaps: string;
  }>;
  home: {
    heroTitulo: string;
    heroSubtitulo: string;
    heroBoton: string;
    seccionPermisos: {
      titulo: string;
      subtitulo: string;
    };
    seccionSedes: {
      titulo: string;
      subtitulo: string;
    };
    seccionContacto: {
      titulo: string;
      subtitulo: string;
    };
  };
  permisos: Array<{
    id: string;
    nombre: string;
    categoria: string;
    subtitulo: string;
    descripcion: string;
    edad: string;
    imagen: string;
    requisitos: string[];
    destacado: boolean;
  }>;
}

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [content, setContent] = useState<Content | null>(null);
  const [activeTab, setActiveTab] = useState('sitio');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        setIsAuthenticated(true);
        loadContent();
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContent = async () => {
    try {
      const res = await fetch('/api/content');
      if (res.ok) {
        const data = await res.json();
        setContent(data);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        loadContent();
      } else {
        setLoginError('Usuario o contrasena incorrectos');
      }
    } catch {
      setLoginError('Error al iniciar sesion');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsAuthenticated(false);
    router.push('/');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });

      if (res.ok) {
        setSaveMessage('Cambios guardados correctamente');
      } else {
        setSaveMessage('Error al guardar los cambios');
      }
    } catch {
      setSaveMessage('Error al guardar los cambios');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const updateContent = (path: string, value: string) => {
    if (!content) return;

    const keys = path.split('.');
    const newContent = { ...content };
    let current: Record<string, unknown> = newContent;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] && typeof current[key] === 'object') {
        current[key] = { ...(current[key] as Record<string, unknown>) };
        current = current[key] as Record<string, unknown>;
      }
    }

    current[keys[keys.length - 1]] = value;
    setContent(newContent as unknown as Content);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Panel de Administracion
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Iniciar sesion
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando contenido...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'sitio', label: 'Datos del sitio' },
    { id: 'home', label: 'Pagina de inicio' },
    { id: 'sedes', label: 'Sedes' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Panel de Administracion</h1>
          <div className="flex items-center gap-4">
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              Cerrar sesion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-6 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido del tab */}
        <div className="bg-white rounded-xl shadow p-6">
          {activeTab === 'sitio' && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Informacion general</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del sitio
                  </label>
                  <input
                    type="text"
                    value={content.sitio.nombre}
                    onChange={(e) => updateContent('sitio.nombre', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slogan
                  </label>
                  <input
                    type="text"
                    value={content.sitio.slogan}
                    onChange={(e) => updateContent('sitio.slogan', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono
                  </label>
                  <input
                    type="text"
                    value={content.sitio.telefono}
                    onChange={(e) => updateContent('sitio.telefono', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={content.sitio.email}
                    onChange={(e) => updateContent('sitio.email', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Horario
                  </label>
                  <input
                    type="text"
                    value={content.sitio.horario}
                    onChange={(e) => updateContent('sitio.horario', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripcion
                  </label>
                  <textarea
                    value={content.sitio.descripcion}
                    onChange={(e) => updateContent('sitio.descripcion', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'home' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Seccion Hero</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titulo principal
                    </label>
                    <input
                      type="text"
                      value={content.home.heroTitulo}
                      onChange={(e) => updateContent('home.heroTitulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtitulo
                    </label>
                    <input
                      type="text"
                      value={content.home.heroSubtitulo}
                      onChange={(e) => updateContent('home.heroSubtitulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Texto del boton
                    </label>
                    <input
                      type="text"
                      value={content.home.heroBoton}
                      onChange={(e) => updateContent('home.heroBoton', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Seccion Permisos</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titulo
                    </label>
                    <input
                      type="text"
                      value={content.home.seccionPermisos.titulo}
                      onChange={(e) => updateContent('home.seccionPermisos.titulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtitulo
                    </label>
                    <input
                      type="text"
                      value={content.home.seccionPermisos.subtitulo}
                      onChange={(e) => updateContent('home.seccionPermisos.subtitulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Seccion Sedes</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titulo
                    </label>
                    <input
                      type="text"
                      value={content.home.seccionSedes.titulo}
                      onChange={(e) => updateContent('home.seccionSedes.titulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtitulo
                    </label>
                    <input
                      type="text"
                      value={content.home.seccionSedes.subtitulo}
                      onChange={(e) => updateContent('home.seccionSedes.subtitulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4">Seccion Contacto</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Titulo
                    </label>
                    <input
                      type="text"
                      value={content.home.seccionContacto.titulo}
                      onChange={(e) => updateContent('home.seccionContacto.titulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtitulo
                    </label>
                    <input
                      type="text"
                      value={content.home.seccionContacto.subtitulo}
                      onChange={(e) => updateContent('home.seccionContacto.subtitulo', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sedes' && (
            <div className="space-y-8">
              {content.sedes.map((sede, index) => (
                <div key={sede.id} className="border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">{sede.nombre}</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={sede.nombre}
                        onChange={(e) => {
                          const newSedes = [...content.sedes];
                          newSedes[index] = { ...newSedes[index], nombre: e.target.value };
                          setContent({ ...content, sedes: newSedes });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Telefono
                      </label>
                      <input
                        type="text"
                        value={sede.telefono}
                        onChange={(e) => {
                          const newSedes = [...content.sedes];
                          newSedes[index] = { ...newSedes[index], telefono: e.target.value };
                          setContent({ ...content, sedes: newSedes });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Direccion
                      </label>
                      <input
                        type="text"
                        value={sede.direccion}
                        onChange={(e) => {
                          const newSedes = [...content.sedes];
                          newSedes[index] = { ...newSedes[index], direccion: e.target.value };
                          setContent({ ...content, sedes: newSedes });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enlace Google Maps
                      </label>
                      <input
                        type="url"
                        value={sede.googleMaps}
                        onChange={(e) => {
                          const newSedes = [...content.sedes];
                          newSedes[index] = { ...newSedes[index], googleMaps: e.target.value };
                          setContent({ ...content, sedes: newSedes });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
