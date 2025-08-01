'use client'; // This directive is necessary for client-side components in Next.js App Router

import React, { useState, useEffect } from 'react';

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setTime(new Date());
        }, 1000); // Update every second

        // Cleanup function
        return () => clearInterval(timerId);
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount

    return (
        <div className="text-lg font-medium text-gray-400">
            {time.toLocaleDateString()} | {time.toLocaleTimeString()}
        </div>
    );
};

export default Clock;
