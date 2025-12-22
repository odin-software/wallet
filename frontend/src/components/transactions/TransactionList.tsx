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
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "../ui";
import type { Transaction, TransactionCategory } from "../../types";
import { CURRENCIES } from "../../types";

interface TransactionListProps {
  transactions: Transaction[];
  currency?: string;
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

export function TransactionList({
  transactions,
  currency = "USD",
}: TransactionListProps) {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const symbol = currencyInfo?.symbol || "$";

  const formatCurrency = (amount: number) => {
    return `${symbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, tx) => {
    const date = formatDate(tx.created_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(tx);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedTransactions).map(([date, txs]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-quaternary/50 mb-3 px-1">
            {date}
          </h3>
          <Card padding="none">
            <div className="divide-y divide-border">
              {txs.map((tx, index) => {
                const isPositive =
                  tx.type === "deposit" || tx.type === "payment";
                const CategoryIcon =
                  categoryIcons[tx.category] || MoreHorizontal;

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 flex items-center gap-4 hover:bg-border/20 transition-colors"
                  >
                    {/* Category Icon */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isPositive ? "bg-success/10" : "bg-danger/10"
                      }`}
                    >
                      <CategoryIcon
                        className={`w-5 h-5 ${
                          isPositive ? "text-success" : "text-danger"
                        }`}
                      />
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-quaternary truncate">
                        {tx.description ||
                          tx.category.charAt(0).toUpperCase() +
                            tx.category.slice(1)}
                      </p>
                      <p className="text-sm text-quaternary/50">
                        {formatTime(tx.created_at)} · {tx.type}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p
                        className={`font-semibold flex items-center gap-1 ${
                          isPositive ? "text-success" : "text-danger"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-quaternary/40">
                        {formatCurrency(tx.balance_after)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
