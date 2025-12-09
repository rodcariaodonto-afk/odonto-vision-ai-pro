import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
}

export function Logo({ className, size = "md", variant = "full" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-14",
    xl: "h-20",
  };

  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Tooth Icon */}
      <div
        className={cn(
          "relative flex items-center justify-center gradient-primary rounded-xl shadow-lg",
          sizeClasses[size],
          size === "sm" && "w-8",
          size === "md" && "w-10",
          size === "lg" && "w-14",
          size === "xl" && "w-20"
        )}
      >
        <svg
          width={iconSizes[size] * 0.6}
          height={iconSizes[size] * 0.7}
          viewBox="0 0 24 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-primary-foreground"
        >
          <path
            d="M12 2C8.5 2 6 4 5 6C4 8 4 10 4.5 13C5 16 5.5 20 7 24C7.5 25.5 8.5 26 9.5 26C11 26 11.5 24 12 22C12.5 24 13 26 14.5 26C15.5 26 16.5 25.5 17 24C18.5 20 19 16 19.5 13C20 10 20 8 19 6C18 4 15.5 2 12 2Z"
            fill="currentColor"
          />
          <circle cx="9" cy="10" r="1.5" fill="hsl(var(--primary))" opacity="0.4" />
          <circle cx="15" cy="10" r="1.5" fill="hsl(var(--primary))" opacity="0.4" />
        </svg>
        {/* AI Sparkle */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-pulse-soft" />
      </div>

      {variant === "full" && (
        <div className="flex flex-col">
          <span
            className={cn(
              "font-bold text-foreground leading-tight",
              size === "sm" && "text-base",
              size === "md" && "text-lg",
              size === "lg" && "text-2xl",
              size === "xl" && "text-3xl"
            )}
          >
            OdontoVision
          </span>
          <span
            className={cn(
              "font-medium text-primary leading-tight",
              size === "sm" && "text-xs",
              size === "md" && "text-sm",
              size === "lg" && "text-base",
              size === "xl" && "text-lg"
            )}
          >
            AI Pro
          </span>
        </div>
      )}
    </div>
  );
}
