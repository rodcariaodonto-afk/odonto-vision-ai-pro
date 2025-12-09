import logoImage from "@/assets/logo-odontovision.png";
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

  return (
    <img
      src={logoImage}
      alt="OdontoVision AI Pro"
      className={cn(
        "object-contain",
        sizeClasses[size],
        variant === "icon" && "w-auto",
        className
      )}
    />
  );
}
