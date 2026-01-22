'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfesionalOpen, setIsProfesionalOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/permisos', label: 'Permisos' },
    { href: '/teorica', label: 'Teórica' },
    { href: '/nosotros', label: 'Nosotros' },
    { href: '/contacto', label: 'Contacto' },
  ];

  const profesionalLinks = [
    { href: '/cap', label: 'Curso CAP' },
    { href: '/adr', label: 'Curso ADR' },
  ];

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.png"
              alt="Autoescuela Monreal"
              width={200}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Dropdown Profesional */}
            <div
              className="relative"
              onMouseEnter={() => setIsProfesionalOpen(true)}
              onMouseLeave={() => setIsProfesionalOpen(false)}
            >
              <button className="text-gray-700 hover:text-primary font-medium transition-colors flex items-center gap-1">
                Profesional
                <svg className={`w-4 h-4 transition-transform ${isProfesionalOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isProfesionalOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg py-2 min-w-[160px] border border-gray-100">
                  {profesionalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {navLinks.slice(2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-primary font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contacto"
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-5 rounded-lg transition-colors"
            >
              Contactar
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              {navLinks.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 hover:text-primary font-medium px-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              {/* Profesional section mobile */}
              <div className="px-2 py-2">
                <span className="text-gray-900 font-semibold">Profesional</span>
                <div className="ml-4 mt-2 flex flex-col space-y-2">
                  {profesionalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-gray-600 hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              {navLinks.slice(2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 hover:text-primary font-medium px-2 py-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/contacto"
                className="bg-primary text-white font-semibold py-3 px-5 rounded-lg text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Contactar
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
