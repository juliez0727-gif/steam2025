import dynamic from 'next/dynamic';
import React from 'react';

// Client-only main app
const ClientApp = dynamic(() => import('../components/ClientApp'), { ssr: false });

export default function HomePage() {
  return <ClientApp />;
}
