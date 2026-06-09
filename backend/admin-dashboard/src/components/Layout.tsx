import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MapPin,
  CreditCard,
  Settings,
  Menu,
  X,
  BarChart3,
  Car,
  Package,
  MessageCircle,
  Bell,
  Power,
  Download
} from 'lucide-react';
import { useAuth } from './AuthContext';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
    description: 'Overview & Analytics'
  },
  {
    name: 'Bookings',
    path: '/bookings',
    icon: Calendar,
    description: 'Manage all bookings'
  },
  {
    name: 'Users',
    path: '/users',
    icon: Users,
    description: 'User management'
  },
  {
    name: 'States & Districts',
    path: '/states',
    icon: MapPin,
    description: 'Location management'
  },
  {
    name: 'Vehicle Types',
    path: '/vehicle-types',
    icon: Car,
    description: 'Manage vehicle types'
  },
  {
    name: 'Plans & Pricing',
    path: '/plans',
    icon: Package,
    description: 'Pricing management'
  },
  {
    name: 'WhatsApp',
    path: '/whatsapp',
    icon: MessageCircle,
    description: 'WhatsApp management'
  },
  {
    name: 'Insurance Inquiries',
    path: '/insurance-inquiries',
    icon: CreditCard,
    description: 'Insurance booking inquiries'
  },
  {
    name: 'Cab Bookings',
    path: '/cab-bookings',
    icon: Car,
    description: 'Manage cab booking requests'
  },
  {
    name: 'Notifications',
    path: '/notifications',
    icon: Bell,
    description: 'Send push notifications'
  },
  {
    name: 'App Status',
    path: '/app-status',
    icon: Power,
    description: 'Turn app on/off & maintenance'
  },
  {
    name: 'App Versions',
    path: '/app-versions',
    icon: Download,
    description: 'Manage OTA updates'
  },
  {
    name: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    description: 'Detailed reports'
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
    description: 'System settings'
  },
    {
    name: 'CustomerLogs',
    path: '/customer-logs',
    icon: Settings,
    description: 'CustomerLogs'
  }
];

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Wadi Cab Admin</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                      isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="text-center text-xs text-gray-500">
            <div>Wadi Cab Admin Panel</div>
            <div className="mt-1">v1.0.0</div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700 mr-4"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {sidebarItems.find(item => isActivePath(item.path))?.name || 'Dashboard'}
                </h1>
                <p className="text-sm text-gray-600">
                  {sidebarItems.find(item => isActivePath(item.path))?.description || 'Welcome to admin dashboard'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notification button */}
            
              
              {/* Admin profile */}
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">A</span>
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium text-gray-900">Admin User</div>
                  <div className="text-xs text-gray-500">admin@wadicab.com</div>
                </div>
                <button
                  onClick={logout}
                  className="ml-2 text-sm text-gray-600 hover:text-gray-900 border px-2 py-1 rounded-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 