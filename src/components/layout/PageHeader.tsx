import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: string;
  right?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, back, right, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 backdrop-blur-md px-4 py-3",
        className
      )}
    >
      {back && (
        <Link
          to={back}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted active:scale-95 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
