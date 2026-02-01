import React from 'react';
import { ShieldCheck, Bell, User } from 'lucide-react';

export function NavBar() {
  return (
    <nav className="h-16 border-b border-border bg-panel sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Verifi<span className="text-blue-400">Suite</span>
          </span>
          <div className="hidden md:flex ml-4 pill pill-online gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            System Online
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative btn btn-ghost p-2 rounded-full hover:bg-white/5 transition-colors">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-panel" />
          </button>
          
          <div className="h-8 w-[1px] bg-border mx-1" />
          
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">Alex Morgan</p>
              <p className="text-xs text-gray-500">Lead Analyst</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
