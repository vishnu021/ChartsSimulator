// frontend/app/layout.js
'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import './globals.css';

export default function RootLayout({ children }) {
    return (
        <html lang="en">
        <body className="bg-gray-900 text-white min-h-screen">
        <Navigation />
        <main className="pt-16">
            {children}
        </main>
        </body>
        </html>
    );
}
