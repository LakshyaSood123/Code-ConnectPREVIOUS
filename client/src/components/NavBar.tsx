import { User } from 'lucide-react';

export function NavBar() {
  return (
    <nav className="h-16 border-b border-[var(--border)] bg-[var(--panel)] sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: 'var(--panel)', opacity: 0.95 }} data-testid="navbar">
      <div className="max-w-[1280px] mx-auto px-6 h-full flex items-center justify-between">
        <div className="flex items-center">
          <img
            src="/brand-logo.png"
            alt="Reagvis Labs Pvt. Ltd."
            className="h-[34px] md:h-[40px] max-w-[280px] object-contain block"
            data-testid="brand-logo"
          />
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm font-medium text-[var(--text)]" data-testid="text-user-label">User</p>
          <div className="w-9 h-9 rounded-full bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center">
            <User className="w-5 h-5 text-[var(--muted)]" />
          </div>
        </div>
      </div>
    </nav>
  );
}
