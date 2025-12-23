import { motion } from "framer-motion";
import { useMemo } from "react";
import { CURRENCIES } from "../../types";

interface DonutChartProps {
  data: Record<string, number>;
  total: number;
  currency: string;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

// Category colors for the chart
const CATEGORY_COLORS: Record<string, string> = {
  groceries: "#22C55E",
  dining: "#F97316",
  transport: "#3B82F6",
  utilities: "#EAB308",
  rent: "#8B5CF6",
  healthcare: "#EC4899",
  entertainment: "#06B6D4",
  shopping: "#F43F5E",
  subscriptions: "#6366F1",
  games: "#A855F7",
  travel: "#14B8A6",
  education: "#0EA5E9",
  fitness: "#84CC16",
  personal: "#D946EF",
  gifts: "#FB923C",
  income: "#10B981",
  transfer: "#64748B",
  other: "#94A3B8",
};

export function DonutChart({
  data,
  total,
  currency,
  selectedCategory,
  onSelectCategory,
}: DonutChartProps) {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const symbol = currencyInfo?.symbol || "$";

  const segments = useMemo(() => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    let currentAngle = 0;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    return entries.map(([category, amount]) => {
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      const strokeDasharray = (percentage / 100) * circumference;
      const strokeDashoffset = -currentAngle * (circumference / 360);
      currentAngle += (percentage / 100) * 360;

      return {
        category,
        amount,
        percentage,
        strokeDasharray,
        strokeDashoffset,
        color: CATEGORY_COLORS[category] || "#94A3B8",
      };
    });
  }, [data, total]);

  const formatCurrency = (amount: number) => {
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  };

  const radius = 80;
  const strokeWidth = 30;
  const size = (radius + strokeWidth) * 2 + 20;
  const center = size / 2;

  return (
    <div className="relative">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        className="max-w-[280px] mx-auto"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />

        {/* Segments */}
        {segments.map((segment, index) => {
          const isSelected = selectedCategory === segment.category;
          const isOtherSelected =
            selectedCategory && selectedCategory !== segment.category;

          return (
            <motion.circle
              key={segment.category}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segment.strokeDasharray} ${
                2 * Math.PI * radius
              }`}
              strokeDashoffset={segment.strokeDashoffset}
              strokeLinecap="butt"
              className="cursor-pointer transition-opacity"
              style={{
                transform: "rotate(-90deg)",
                transformOrigin: "center",
                opacity: isOtherSelected ? 0.3 : 1,
              }}
              initial={{ strokeDasharray: `0 ${2 * Math.PI * radius}` }}
              animate={{
                strokeDasharray: `${segment.strokeDasharray} ${
                  2 * Math.PI * radius
                }`,
                scale: isSelected ? 1.05 : 1,
              }}
              transition={{
                strokeDasharray: { duration: 0.8, delay: index * 0.1 },
                scale: { duration: 0.2 },
              }}
              onClick={() =>
                onSelectCategory(
                  selectedCategory === segment.category
                    ? null
                    : segment.category
                )
              }
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {selectedCategory ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-1"
            >
              <p className="text-xs text-quaternary/60 capitalize">
                {selectedCategory.replace("_", " ")}
              </p>
              <p className="text-xl font-bold text-quaternary">
                {formatCurrency(data[selectedCategory] || 0)}
              </p>
              <p className="text-xs text-quaternary/50">
                {total > 0
                  ? ((data[selectedCategory] / total) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-1"
            >
              <p className="text-xs text-quaternary/60">Total Expenses</p>
              <p className="text-xl font-bold text-quaternary">
                {formatCurrency(total)}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export { CATEGORY_COLORS };
