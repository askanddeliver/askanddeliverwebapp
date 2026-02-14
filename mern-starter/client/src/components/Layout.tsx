import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 print:hidden">
        <div className="container mx-auto px-4 text-center text-gray-600 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Ask & Deliver. Time Tracking &
            Invoicing for Creative Services.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
