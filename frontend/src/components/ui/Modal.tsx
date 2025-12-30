import { type ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "full";
}

const sizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  full: "max-w-[95vw] md:max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70"
            style={{ willChange: "opacity" }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`
              fixed left-1/2 top-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2
              ${sizes[size]}
            `}
            style={{ willChange: "transform, opacity" }}
          >
            <div className="mx-4 rounded-2xl bg-card border border-border shadow-2xl shadow-black/30 max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="text-xl font-semibold text-quaternary">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg text-quaternary/60 hover:text-quaternary hover:bg-border/50 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className="p-6 overflow-y-auto flex-1">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Bottom Sheet variant for mobile
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70"
            style={{ willChange: "opacity" }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card border-t border-border max-h-[85vh] overflow-hidden"
            style={{ willChange: "transform" }}
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 rounded-full bg-border" />
            </div>

            {title && (
              <div className="px-6 pb-4">
                <h2 className="text-xl font-semibold text-quaternary">
                  {title}
                </h2>
              </div>
            )}

            <div className="px-6 pb-8 overflow-y-auto max-h-[calc(85vh-80px)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
