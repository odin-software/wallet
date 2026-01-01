import { motion } from "framer-motion";
import {
  ShoppingCart,
  Utensils,
  Car,
  Zap,
  Home,
  Heart,
  Film,
  ShoppingBag,
  RefreshCw,
  Gamepad2,
  Plane,
  GraduationCap,
  Dumbbell,
  User,
  Gift,
  TrendingUp,
  ArrowLeftRight,
  MoreHorizontal,
} from "lucide-react";
import {
  CURRENCIES,
  type TransactionCategory,
  type CategoryReport,
} from "../../types";
import { CATEGORY_COLORS } from "./DonutChart";

interface CategoryBreakdownProps {
  data: CategoryReport[];
  total: number;
  currency: string;
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
}

const categoryIcons: Record<TransactionCategory, React.ElementType> = {
  groceries: ShoppingCart,
  dining: Utensils,
  transport: Car,
  utilities: Zap,
  rent: Home,
  healthcare: Heart,
  entertainment: Film,
  shopping: ShoppingBag,
  subscriptions: RefreshCw,
  games: Gamepad2,
  travel: Plane,
  education: GraduationCap,
  fitness: Dumbbell,
  personal: User,
  gifts: Gift,
  income: TrendingUp,
  transfer: ArrowLeftRight,
  other: MoreHorizontal,
};

const categoryLabels: Record<string, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  utilities: "Utilities",
  rent: "Rent",
  healthcare: "Healthcare",
  entertainment: "Entertainment",
  shopping: "Shopping",
  subscriptions: "Subscriptions",
  games: "Games",
  travel: "Travel",
  education: "Education",
  fitness: "Fitness",
  personal: "Personal",
  gifts: "Gifts",
  income: "Income",
  transfer: "Transfer",
  other: "Other",
};

export function CategoryBreakdown({
  data,
  total,
  currency,
  selectedCategory,
  onSelectCategory,
}: CategoryBreakdownProps) {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const symbol = currencyInfo?.symbol || "$";

  // Sort categories by amount descending
  const sortedCategories = data
    .filter((cat) => cat.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const formatCurrency = (amount: number) => {
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getBudgetColor = (percentage?: number) => {
    if (!percentage) return undefined;
    if (percentage > 100) return "#EF4444"; // red
    if (percentage >= 80) return "#EAB308"; // yellow
    return "#22C55E"; // green
  };

  if (sortedCategories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-quaternary/60">No expenses this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedCategories.map((categoryReport, index) => {
        const {
          category,
          amount,
          budget,
          percentage: budgetPercentage,
          remaining,
        } = categoryReport;
        const percentage = total > 0 ? (amount / total) * 100 : 0;
        const Icon =
          categoryIcons[category as TransactionCategory] || MoreHorizontal;
        const color = CATEGORY_COLORS[category] || "#94A3B8";
        const isSelected = selectedCategory === category;
        const isOtherSelected =
          selectedCategory && selectedCategory !== category;

        return (
          <motion.button
            key={category}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() =>
              onSelectCategory(selectedCategory === category ? null : category)
            }
            className={`w-full p-3 rounded-xl transition-all ${
              isSelected
                ? "bg-card"
                : isOtherSelected
                ? "bg-card/50 opacity-50"
                : "bg-card hover:bg-card/80"
            }`}
            style={isSelected ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
          >
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>

              {/* Category info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-quaternary text-sm">
                    {categoryLabels[category] || category}
                  </p>
                  <div className="text-right">
                    <p className="font-semibold text-quaternary text-sm">
                      {formatCurrency(amount)}
                      {budget && (
                        <span className="text-quaternary/50 font-normal">
                          {" "}
                          / {formatCurrency(budget)}
                        </span>
                      )}
                    </p>
                    {budgetPercentage !== undefined && (
                      <p
                        className="text-xs font-medium mt-0.5"
                        style={{ color: getBudgetColor(budgetPercentage) }}
                      >
                        {budgetPercentage.toFixed(0)}% used
                      </p>
                    )}
                  </div>
                </div>

                {/* Budget progress bar (if budget exists) */}
                {budget && budgetPercentage !== undefined ? (
                  <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: getBudgetColor(budgetPercentage),
                      }}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(budgetPercentage, 100)}%`,
                      }}
                      transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                    />
                  </div>
                ) : (
                  /* Regular progress bar */
                  <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                    />
                  </div>
                )}

                {/* Bottom text */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-quaternary/50">
                    {percentage.toFixed(1)}% of total expenses
                  </p>
                  {remaining !== undefined && (
                    <p
                      className={`text-xs font-medium ${
                        remaining >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {remaining >= 0 ? "" : ""}
                      {formatCurrency(Math.abs(remaining))}{" "}
                      {remaining >= 0 ? "left" : "over"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
