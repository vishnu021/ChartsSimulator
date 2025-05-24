'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('./Chart'), { ssr: false });

export default function ClientOnlyChart() {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        function onResize() {
            setSize({ width: window.innerWidth, height: window.innerHeight });
        }
        onResize();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    if (size.width === 0) return null;
    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Chart containerWidth={size.width} containerHeight={size.height} />
        </div>
    );
}
