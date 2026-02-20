import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Bell, User } from 'lucide-react';

export default function Navbar() {
    return (
        <header className="px-8 py-6 mb-4 flex items-center justify-between z-50 relative">
            <Link to="/" className="flex items-center gap-4 group no-underline">
                <div className="w-12 h-12 rounded-2xl neu-plate flex items-center justify-center text-neu-accent shadow-[0_0_15px_rgba(255,107,0,0.15)] group-hover:shadow-[0_0_20px_rgba(255,107,0,0.4)] transition-all duration-500">
                    <Layers size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-neu-text tracking-tight group-hover:text-neu-accent transition-colors duration-300">
                        Dataset Lab
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neu-accent/50 animate-pulse"></div>
                        <span className="text-xs text-neu-dim font-medium tracking-wider uppercase">Control Console</span>
                    </div>
                </div>
            </Link>

            <div className="flex items-center gap-6">
                <button className="neu-btn p-3 rounded-full text-neu-dim hover:text-neu-accent hover:shadow-[0_0_10px_rgba(255,107,0,0.2)]">
                    <Bell size={20} />
                </button>
                <div className="h-8 w-[1px] bg-neu-dark border-r border-white/5"></div>
                <button className="flex items-center gap-3 neu-plate px-4 py-2 rounded-full hover:text-neu-accent group transition-all">
                    <div className="w-8 h-8 rounded-full bg-neu-dark flex items-center justify-center text-neu-dim group-hover:text-neu-accent font-bold text-xs border border-white/5 shadow-inner">
                        <User size={14} />
                    </div>
                    <span className="text-sm font-medium text-neu-dim group-hover:text-neu-text">Admin</span>
                </button>
            </div>
        </header>
    );
}
