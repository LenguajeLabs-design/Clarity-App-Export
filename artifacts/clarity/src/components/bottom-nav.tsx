import { Link, useLocation } from "wouter";
import { Home, Inbox, Sun, Folder, Menu, Calendar, CheckCircle, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";

export function BottomNav() {
  const [location] = useLocation();
  
  const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`flex flex-col items-center justify-center w-[72px] h-[64px] rounded-2xl transition-all ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}>
        <Icon className={`w-6 h-6 mb-1 transition-all ${isActive ? 'fill-primary/20 scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-[11px] font-semibold tracking-wide">{label}</span>
      </Link>
    )
  };

  return (
    <nav className="absolute bottom-0 w-full bg-background/95 backdrop-blur-xl border-t border-border flex justify-around items-center h-[90px] px-2 z-50 pb-safe">
      <NavItem href="/" icon={Home} label="Capture" />
      <NavItem href="/inbox" icon={Inbox} label="Inbox" />
      <NavItem href="/today" icon={Sun} label="Today" />
      <NavItem href="/projects" icon={Folder} label="Projects" />
      
      <Sheet>
        <SheetTrigger className="flex flex-col items-center justify-center w-[72px] h-[64px] rounded-2xl text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all outline-none">
          <Menu className="w-6 h-6 mb-1" strokeWidth={2} />
          <span className="text-[11px] font-semibold tracking-wide">More</span>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-[2rem] pb-12 border-t-0 shadow-2xl bg-card max-w-[430px] mx-auto w-full">
          <SheetTitle className="sr-only">More Menu</SheetTitle>
          <div className="flex flex-col gap-3 mt-6 px-4">
            <SheetClose asChild>
              <Link href="/upcoming" className="flex items-center gap-5 p-5 rounded-2xl bg-background hover:bg-accent transition-colors border border-border/50 shadow-sm active:scale-[0.98]">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Calendar className="w-7 h-7" />
                </div>
                <span className="text-xl font-bold">Upcoming</span>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/review" className="flex items-center gap-5 p-5 rounded-2xl bg-background hover:bg-accent transition-colors border border-border/50 shadow-sm active:scale-[0.98]">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <span className="text-xl font-bold">Weekly Review</span>
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link href="/settings" className="flex items-center gap-5 p-5 rounded-2xl bg-background hover:bg-accent transition-colors border border-border/50 shadow-sm active:scale-[0.98]">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-foreground">
                  <Settings className="w-7 h-7" />
                </div>
                <span className="text-xl font-bold">Settings</span>
              </Link>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  )
}
