"use client"

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

const Layout = ({ 
  children, 
  title = 'Studentjobbsplattform', 
  description = 'Hitta studentjobb inom ditt utbildningsområde'
}: LayoutProps) => {
  const pathname = usePathname();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow px-4 sm:px-6 py-8 bg-gray-50">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;