import { ReactNode } from 'react';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-brand-cream">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}

export default PublicLayout;
