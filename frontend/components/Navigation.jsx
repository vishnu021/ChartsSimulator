'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navigation() {
    const router = useRouter();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const navItems = [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/candles', label: 'Candles', icon: '📊' },
        { path: '/extrema', label: 'Extrema', icon: '📈' },
        { path: '/charts', label: 'Charts', icon: '📉' },
        { path: '/ticker', label: 'Ticker', icon: '⚡' }
    ];

    const isActive = (path) => {
        if (path === '/') return pathname === '/';
        return pathname.startsWith(path);
    };

    const handleNavigation = (path) => {
        console.log(`Navigating from ${pathname} to ${path}`);
        setIsMenuOpen(false);
        router.push(path);
    };

    return (
        <nav className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div
                        onClick={() => handleNavigation('/')}
                        className="flex items-center cursor-pointer"
                    >
                        <span className="text-xl font-bold text-white">Charts Simulator</span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavigation(item.path)}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActive(item.path)
                                            ? 'bg-gray-700 text-white'
                                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                                    }`}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="bg-gray-700 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-600"
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <span className="block h-6 w-6">✕</span>
                            ) : (
                                <span className="block h-6 w-6">☰</span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMenuOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-700">
                        {navItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => handleNavigation(item.path)}
                                className={`block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors ${
                                    isActive(item.path)
                                        ? 'bg-gray-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-600 hover:text-white'
                                }`}
                            >
                                <span className="mr-2">{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
}
