import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PanInfo } from "framer-motion";
import {
  Wallet,
  CreditCard,
  Receipt,
  PieChart,
  Target,
  ChevronRight,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Layers,
  BarChart3,
} from "lucide-react";

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface Slide {
  id: number;
  icon: React.ElementType;
  secondaryIcons?: React.ElementType[];
  title: string;
  subtitle: string;
  description: string;
  gradient: string;
}

const slides: Slide[] = [
  {
    id: 0,
    icon: Wallet,
    secondaryIcons: [Sparkles, TrendingUp],
    title: "Welcome to",
    subtitle: "Odin Wallet",
    description:
      "Your personal finance companion. Track spending, manage accounts, and achieve your financial goals.",
    gradient: "from-primary/20 via-primary/5 to-transparent",
  },
  {
    id: 1,
    icon: CreditCard,
    secondaryIcons: [Layers],
    title: "Track Multiple",
    subtitle: "Accounts",
    description:
      "Add checking accounts, savings, credit cards, loans, and investments. See everything in one place.",
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
  },
  {
    id: 2,
    icon: Receipt,
    secondaryIcons: [BarChart3],
    title: "Log Your",
    subtitle: "Transactions",
    description:
      "Easily record expenses and income. Categorize spending to understand your habits better.",
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
  },
  {
    id: 3,
    icon: PieChart,
    secondaryIcons: [TrendingUp],
    title: "Visual",
    subtitle: "Reports",
    description:
      "See where your money goes with beautiful charts and breakdowns. Track weekly or monthly trends.",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
  },
  {
    id: 4,
    icon: Target,
    secondaryIcons: [Sparkles],
    title: "Set Monthly",
    subtitle: "Budgets",
    description:
      "Create spending limits for categories. Get insights when you're approaching or exceeding budgets.",
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
  },
];

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function OnboardingCarousel({
  onComplete,
  onSkip,
}: OnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const isLastSlide = currentIndex === slides.length - 1;

  const paginate = (newDirection: number) => {
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < slides.length) {
      setDirection(newDirection);
      setCurrentIndex(newIndex);
    }
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    { offset, velocity }: PanInfo
  ) => {
    const swipe = swipePower(offset.x, velocity.x);

    if (swipe < -swipeConfidenceThreshold) {
      if (currentIndex < slides.length - 1) {
        paginate(1);
      }
    } else if (swipe > swipeConfidenceThreshold) {
      if (currentIndex > 0) {
        paginate(-1);
      }
    }
  };

  const currentSlide = slides[currentIndex];

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 40 : -40,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-tertiary flex flex-col">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onSkip}
          className="px-4 py-2 text-sm text-quaternary/60 hover:text-quaternary transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "tween", duration: 0.2, ease: "easeOut" },
              opacity: { duration: 0.15 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={handleDragEnd}
            className="w-full max-w-md flex flex-col items-center text-center cursor-grab active:cursor-grabbing"
          >
            {/* Illustration area */}
            <div className="relative mb-12">
              {/* Background gradient - reduced blur on mobile for performance */}
              <div
                className={`absolute inset-0 w-48 h-48 rounded-full bg-gradient-radial ${currentSlide.gradient} blur-2xl mobile-no-bg-blur scale-150`}
              />

              {/* Main icon */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.05,
                  type: "tween",
                  duration: 0.25,
                  ease: "easeOut",
                }}
                className="relative z-10 w-32 h-32 rounded-3xl bg-card border border-border flex items-center justify-center shadow-2xl"
              >
                <currentSlide.icon className="w-16 h-16 text-primary" />
              </motion.div>

              {/* Secondary floating icons */}
              {currentSlide.secondaryIcons?.map((Icon, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15 + index * 0.05, duration: 0.2 }}
                  className={`absolute ${
                    index === 0 ? "-top-4 -right-4" : "-bottom-2 -left-4"
                  } p-3 rounded-xl bg-card/80 border border-border shadow-lg`}
                >
                  <Icon className="w-5 h-5 text-quaternary/70" />
                </motion.div>
              ))}
            </div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              <h2 className="text-quaternary/60 text-lg mb-1">
                {currentSlide.title}
              </h2>
              <h1 className="text-4xl md:text-5xl font-bold text-quaternary mb-6">
                {currentSlide.subtitle}
              </h1>
              <p className="text-quaternary/60 text-base leading-relaxed max-w-sm mx-auto">
                {currentSlide.description}
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="px-6 pb-12 space-y-6">
        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "w-8 bg-primary"
                  : "w-2 bg-quaternary/30 hover:bg-quaternary/50"
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <div className="flex justify-center">
          {isLastSlide ? (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={onComplete}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-tertiary font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          ) : (
            <button
              onClick={() => paginate(1)}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-card text-quaternary font-medium rounded-xl border border-border hover:border-primary/30 transition-all"
            >
              Next
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
