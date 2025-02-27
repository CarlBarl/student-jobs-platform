import React, { ReactNode } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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
  const router = useRouter();
  
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* PWA primary color */}
        <meta name="theme-color" content="#0ea5e9" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://yourdomain.com${router.asPath}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://yourdomain.com/og-image.jpg" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://yourdomain.com${router.asPath}`} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:image" content="https://yourdomain.com/twitter-image.jpg" />
      </Head>
      
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow px-4 sm:px-6 py-8 bg-gray-50">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Layout;