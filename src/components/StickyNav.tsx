import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, LogOut, User, Award, ArrowRight, ShieldCheck, LayoutDashboard, LineChart, Compass, UserCircle2, Upload, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole, useAchievementCount } from "@/hooks/useUserRole";
import NavbarXPCounter from "@/components/xp/NavbarXPCounter";
import genlinkLogo from "@/assets/genlink-logo.png";
import AdaptEngineLink from "@/components/adapt/AdaptEngineLink";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const StickyNav = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { tier, roleLabel, isAdmin, isDepartmentMember, departmentRole } = useUserRole();
  const canManageTeam = isAdmin || departmentRole === "ceo";
  const { data: badgeCount = 0 } = useAchievementCount();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Context-aware primary nav links. Team members always see Operations
  // Dashboard first (with icon) so they never have to type the URL, and keep
  // access to the Student Journey for previewing what learners experience.
  type NavLink = { name: string; href: string; icon?: React.ComponentType<{ className?: string }> };
  const navLinks: NavLink[] =
    tier === "team"
      ? [
          { name: "Operations Dashboard", href: "/ops-dashboard", icon: LayoutDashboard },
          { name: "Student Journey", href: "/journey", icon: Compass },
          ...(canManageTeam
            ? [{ name: "Learner Insights", href: "/learner-insights", icon: LineChart } as NavLink]
            : []),
          { name: "Community", href: "/events" },
          { name: "Resources", href: "/resources" },
        ]
      : tier === "student"
        ? [
            { name: "My Journey", href: "/journey" },
            { name: "My Plan", href: "/my-plan" },
            { name: "Community", href: "/events" },
            { name: "Resources", href: "/resources" },
          ]
        : [
            { name: "About", href: "/#about" },
            { name: "How It Works", href: "/#how-it-works" },
            { name: "Pillars Preview", href: "/#pillars-preview" },
          ];

  const location = useLocation();

  // Hash links: scroll smoothly when already on "/", else go home first and
  // scroll once the section exists. Always closes the mobile menu.
  const goToHash = (href: string) => (e: React.MouseEvent) => {
    if (!href.includes("#")) return;
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const id = href.split("#")[1];
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    if (location.pathname === "/") {
      scroll();
    } else {
      navigate("/");
      window.setTimeout(scroll, 350);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "";

  const ProfileMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open profile menu"
          className="h-9 w-9 rounded-full bg-primary-foreground/15 text-primary-foreground text-xs font-semibold flex items-center justify-center hover:bg-primary-foreground/25 transition-colors"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-semibold truncate">{user?.user_metadata?.full_name ?? "Learner"}</div>
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <UserCircle2 className="w-4 h-4 mr-2" /> My Profile
        </DropdownMenuItem>
        {isDepartmentMember && (
          <DropdownMenuItem onClick={() => navigate("/ops-dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Operations Dashboard
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin/import")}>
            <Upload className="w-4 h-4 mr-2" /> Content Importer
          </DropdownMenuItem>
        )}
        {canManageTeam && (
          <DropdownMenuItem onClick={() => navigate("/team-management")}>
            <Users className="w-4 h-4 mr-2" /> Team Management
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderRightSide = () => {
    // Layer 3 — team / admin
    if (tier === "team") {
      return (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-1 text-xs font-semibold text-[#C9A84C]">
            <ShieldCheck className="w-3.5 h-3.5" />
            {roleLabel}
          </span>
          <ProfileMenu />
        </>
      );
    }

    // Layer 2 — authenticated student
    if (tier === "student") {
      return (
        <>
          <NavbarXPCounter />
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
            style={{
              background: "rgba(201,168,76,0.12)",
              color: "#C9A84C",
              border: "1px solid rgba(201,168,76,0.35)",
            }}
            aria-label={`${badgeCount} badges earned`}
          >
            <Award className="w-3.5 h-3.5" />
            <span className="tabular-nums">{badgeCount}</span>
          </span>
          <ProfileMenu />
        </>
      );
    }

    // Layer 1 — public visitor
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/auth")}
          className="bg-white text-[#0D1B33] border-white hover:bg-white/90 font-semibold"
        >
          <LogIn className="w-4 h-4 mr-1" />
          Sign In
        </Button>
        <Button
          onClick={() => navigate("/pathway-intelligence")}
          className="group bg-[#C9A84C] text-[#0F1B33] hover:bg-[#C9A84C]/90 font-semibold"
        >
          Start Your Assessment
          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </>
    );
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-lg border-b border-primary-foreground/10
          ${isScrolled ? 'shadow-lg' : ''}`}
        style={{ backgroundColor: "rgba(13,27,51,0.88)" }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src={genlinkLogo} 
                alt="Genlink Hub" 
                className="h-10 w-auto transition-transform group-hover:scale-105"
              />
              <span className="font-bold text-xl hidden sm:block text-primary-foreground">
                Genlink Hub
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={goToHash(link.href)}
                  className="text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground transition-colors relative group"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {link.icon ? <link.icon className="w-4 h-4" /> : null}
                    {link.name}
                  </span>
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-accent transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
              <AdaptEngineLink className="text-sm font-semibold text-[#F1CF6A] hover:text-white transition-colors relative group" />
            </div>

            <div className="hidden md:flex items-center gap-3">{renderRightSide()}</div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors text-primary-foreground hover:bg-primary-foreground/10"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div 
          className={`md:hidden absolute top-full left-0 right-0 bg-primary/95 backdrop-blur-lg border-b border-primary-foreground/10 shadow-xl transition-all duration-300 overflow-hidden
            ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={(e) => { goToHash(link.href)(e); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-2 py-2 text-primary-foreground/90 hover:text-primary-foreground transition-colors"
              >
                {link.icon ? <link.icon className="w-4 h-4" /> : null}
                <span>{link.name}</span>
              </Link>
            ))}
            <AdaptEngineLink
              mobile
              onNavigate={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-2 py-2 font-semibold text-[#F1CF6A] hover:text-white transition-colors"
            />
            {tier === "guest" ? (
              <>
                <Button
                  onClick={() => { navigate("/auth"); setIsMobileMenuOpen(false); }}
                  variant="outline"
                  className="w-full bg-white text-[#0D1B33] border-white hover:bg-white/90 font-semibold"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  onClick={() => { navigate("/pathway-intelligence"); setIsMobileMenuOpen(false); }}
                  className="w-full bg-[#C9A84C] text-[#0F1B33] hover:bg-[#C9A84C]/90 font-semibold"
                >
                  Start Your Assessment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between pt-2 border-t border-primary-foreground/10">
                <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
                  <User className="w-4 h-4" />
                  <span className="max-w-[160px] truncate">{user?.email}</span>
                  {tier === "team" && (
                    <span className="ml-2 text-xs text-[#C9A84C]">{roleLabel}</span>
                  )}
                </div>
                <Button onClick={handleSignOut} variant="outline" size="sm" className="border-primary-foreground/30 text-primary-foreground">
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="h-16 md:h-20" />
    </>
  );
};

export default StickyNav;
