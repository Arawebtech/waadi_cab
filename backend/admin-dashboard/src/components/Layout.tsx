import React, { useState } from 'react';

import { Outlet, Link, useLocation } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import {

  LayoutDashboard, Users, Calendar, MapPin, CreditCard, Settings, Menu, X,

  BarChart3, Car, Package, MessageCircle, Bell, Power, Download, ScrollText,

  ShieldCheck, Wallet, UserCog, Navigation, ChevronLeft, ChevronRight, Moon, Sun, Radio

} from 'lucide-react';

import { useAuth } from './AuthContext';

import { useTheme } from '../context/ThemeContext';



interface SidebarItem {

  name: string;

  path: string;

  icon: React.ComponentType<{ className?: string }>;

  section?: string;

}



const sidebarItems: SidebarItem[] = [

  { name: 'Dashboard', path: '/', icon: LayoutDashboard, section: 'Border Tax' },

  { name: 'Bookings', path: '/bookings', icon: Calendar, section: 'Border Tax' },

  { name: 'Users', path: '/users', icon: Users, section: 'Border Tax' },

  { name: 'States & Districts', path: '/states', icon: MapPin, section: 'Border Tax' },

  { name: 'Vehicle Types', path: '/vehicle-types', icon: Car, section: 'Border Tax' },

  { name: 'Plans & Pricing', path: '/plans', icon: Package, section: 'Border Tax' },

  { name: 'WhatsApp', path: '/whatsapp', icon: MessageCircle, section: 'Border Tax' },

  { name: 'Insurance', path: '/insurance-inquiries', icon: CreditCard, section: 'Border Tax' },

  { name: 'Cab Bookings', path: '/cab-bookings', icon: Car, section: 'Border Tax' },

  { name: 'Cab Dashboard', path: '/cab-operations', icon: LayoutDashboard, section: 'Cab Ops' },

  { name: 'Live Fleet', path: '/cab-live-fleet', icon: Radio, section: 'Cab Ops' },

  { name: 'Cab Drivers', path: '/cab-drivers', icon: Car, section: 'Cab Ops' },

  { name: 'Cab Customers', path: '/cab-customers', icon: Users, section: 'Cab Ops' },

  { name: 'Cab Rides', path: '/cab-rides', icon: Navigation, section: 'Cab Ops' },

  { name: 'Subscriptions', path: '/cab-subscriptions', icon: CreditCard, section: 'Cab Ops' },

  { name: 'Wallets', path: '/cab-wallets', icon: Wallet, section: 'Cab Ops' },

  { name: 'Verifications', path: '/cab-verifications', icon: ShieldCheck, section: 'Cab Ops' },
  { name: 'Verification History', path: '/cab-verifications/history', icon: ScrollText, section: 'Cab Ops' },

  { name: 'Cab Reports', path: '/cab-reports', icon: BarChart3, section: 'Cab Ops' },

  { name: 'Cab Admins', path: '/cab-admins', icon: UserCog, section: 'Cab Ops' },

  { name: 'Notifications', path: '/notifications', icon: Bell, section: 'System' },

  { name: 'App Status', path: '/app-status', icon: Power, section: 'System' },

  { name: 'App Versions', path: '/app-versions', icon: Download, section: 'System' },

  { name: 'Analytics', path: '/analytics', icon: BarChart3, section: 'System' },

  { name: 'Settings', path: '/settings', icon: Settings, section: 'System' },

  { name: 'Customer Logs', path: '/customer-logs', icon: ScrollText, section: 'System' },

  { name: 'Audit Trail', path: '/audit-trail', icon: ScrollText, section: 'System' },

  { name: 'Payment Gateway', path: '/payment-change', icon: Settings, section: 'System' },

];



const Layout: React.FC = () => {

  const [mobileOpen, setMobileOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);

  const location = useLocation();

  const { logout } = useAuth();

  const { isDark, toggleTheme } = useTheme();



  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/cab-verifications') return location.pathname === '/cab-verifications';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };



  const activeItem = sidebarItems.find(item => isActivePath(item.path));

  const sections = Array.from(new Set(sidebarItems.map(i => i.section)));



  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-64';



  return (

    <div className="h-screen overflow-hidden flex bg-slate-100 dark:bg-slate-950">

      {mobileOpen && (

        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />

      )}



      <aside

        className={`fixed lg:static inset-y-0 left-0 z-50 ${sidebarWidth} flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}

      >

        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200/80 dark:border-slate-800 flex-shrink-0">

          {!collapsed && <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">Wadi Cab</h1>}

          <button onClick={() => setCollapsed(!collapsed)} className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">

            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}

          </button>

          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-2 text-slate-500"><X className="h-5 w-5" /></button>

        </div>



        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 scrollbar-thin">

          {sections.map(section => (

            <div key={section} className="mb-4">

              {!collapsed && section && (

                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{section}</p>

              )}

              <div className="space-y-0.5">

                {sidebarItems.filter(i => i.section === section).map(item => {

                  const Icon = item.icon;

                  const active = isActivePath(item.path);

                  return (

                    <Link

                      key={item.path}

                      to={item.path}

                      onClick={() => setMobileOpen(false)}

                      title={collapsed ? item.name : undefined}

                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}

                    >

                      <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />

                      {!collapsed && <span className="truncate">{item.name}</span>}

                    </Link>

                  );

                })}

              </div>

            </div>

          ))}

        </nav>



        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 flex-shrink-0">

          {!collapsed && <p className="text-center text-[10px] text-slate-400">v2.0 · Cab Admin</p>}

        </div>

      </aside>



      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        <header className="flex-shrink-0 h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between z-10">

          <div className="flex items-center gap-3 min-w-0">

            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">

              <Menu className="h-5 w-5" />

            </button>

            <div className="min-w-0">

              <h1 className="text-lg font-bold text-slate-900 dark:text-white truncate">{activeItem?.name || 'Dashboard'}</h1>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors" title="Toggle theme">

              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}

            </button>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">

              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>

              <button onClick={logout} className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">Logout</button>

            </div>

          </div>

        </header>



        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">

          <AnimatePresence mode="wait">

            <motion.div

              key={location.pathname}

              initial={{ opacity: 0, y: 8 }}

              animate={{ opacity: 1, y: 0 }}

              exit={{ opacity: 0, y: -8 }}

              transition={{ duration: 0.2 }}

              className="h-full"

            >

              <Outlet />

            </motion.div>

          </AnimatePresence>

        </main>

      </div>

    </div>

  );

};



export default Layout;

