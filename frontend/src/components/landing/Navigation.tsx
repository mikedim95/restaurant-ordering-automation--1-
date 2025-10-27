import { Menu } from 'lucide-react';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { MqttStatus } from '../MqttStatus';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
              <span className="text-white font-black text-lg">OF</span>
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              OrderFlow
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-medium">
                  Solutions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-dark border-white/10">
                <DropdownMenuItem>For Restaurants</DropdownMenuItem>
                <DropdownMenuItem>For Cafes</DropdownMenuItem>
                <DropdownMenuItem>For Bars</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-sm font-medium">
                  Resources
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="glass-dark border-white/10">
                <DropdownMenuItem>Documentation</DropdownMenuItem>
                <DropdownMenuItem>API Reference</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <a href="#demo-qr" className="text-sm font-medium hover:text-primary transition-colors">
              Demo
            </a>

            <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </a>
          </div>

          {/* Right side - Status and Language */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            <MqttStatus />
            <LanguageSwitcher />
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            <MqttStatus />
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-dark border-white/10 w-48">
                <DropdownMenuItem>Solutions</DropdownMenuItem>
                <DropdownMenuItem>Resources</DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#demo-qr">Demo</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/login">Login</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};
