import { useState } from 'react';
import { Home, LogIn, ChefHat, UtensilsCrossed, Cog } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'react-router-dom';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { HomeLink } from '../components/HomeLink';

interface AppBurgerProps {
  className?: string;
  title?: string;
  children?: React.ReactNode; // page-specific actions
}

export const AppBurger = ({ className = '', title, children }: AppBurgerProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={`relative inline-flex items-center justify-center h-10 w-10 rounded-full border hover:bg-gray-50 transition ${className}`}
          aria-label="Open menu"
        >
          {/* Animated burger */}
          <span className={`block w-5 h-0.5 bg-gray-800 rounded absolute transition-transform duration-300 ${open ? 'rotate-45' : '-translate-y-1.5'}`} />
          <span className={`block w-5 h-0.5 bg-gray-800 rounded absolute transition-opacity duration-300 ${open ? 'opacity-0' : 'opacity-100'}`} />
          <span className={`block w-5 h-0.5 bg-gray-800 rounded absolute transition-transform duration-300 ${open ? '-rotate-45' : 'translate-y-1.5'}`} />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm flex flex-col">
        <SheetHeader>
          <SheetTitle>{title ?? 'Menu'}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {children ? (
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Quick Actions</h3>
              <div className="space-y-2">{children}</div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Navigation</h3>
            <NavLink to="/" label="Home" icon={<Home className="h-4 w-4" />} />
            <NavLink to="/login" label="Login" icon={<LogIn className="h-4 w-4" />} />
            <NavLink to="/waiter" label="Waiter" icon={<UtensilsCrossed className="h-4 w-4" />} />
            <NavLink to="/cook" label="Cook" icon={<ChefHat className="h-4 w-4" />} />
            <NavLink to="/manager" label="Manager" icon={<Cog className="h-4 w-4" />} />
          </section>

          <section className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Preferences</h3>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <HomeLink />
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const NavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => (
  <Link 
    to={to} 
    className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm px-4 py-3 transition-all hover:bg-accent hover:border-primary/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" 
    onClick={() => {}}
  >
    <span className="text-primary">{icon}</span>
    <span className="font-medium">{label}</span>
  </Link>
);
