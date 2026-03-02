import './globals.css';

export const metadata = {
  title: 'Lead Hunter — T800 Labs',
  description: 'Panel de gestión de leads y automatización',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
