import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  variant?: "default" | "elevated" | "outlined";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const variants = {
  default: "bg-card border border-border",
  elevated: "bg-card border border-border shadow-xl shadow-black/20",
  outlined: "bg-transparent border-2 border-border",
};

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  variant = "default",
  hover = false,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      className={`
        rounded-2xl
        ${variants[variant]}
        ${paddings[padding]}
        ${
          hover
            ? "cursor-pointer transition-shadow hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
            : ""
        }
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
}
