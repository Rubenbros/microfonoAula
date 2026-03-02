import Sidebar from './Sidebar';

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 p-6">
        {children}
      </main>
    </div>
  );
}
