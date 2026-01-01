import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
} from "lucide-react";
import { reports as reportsApi } from "../api/client";
import { Button, Card } from "../components/ui";
import { DonutChart } from "../components/reports/DonutChart";
import { CategoryBreakdown } from "../components/reports/CategoryBreakdown";
import type { ReportResponse, ReportPeriod } from "../types";
import { CURRENCIES } from "../types";

export function Reports() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Format date for API
  const getDateParam = () => {
    if (period === "month") {
      return `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, "0")}`;
    } else {
      return currentDate.toISOString().split("T")[0];
    }
  };

  // Format period display
  const getPeriodLabel = () => {
    if (period === "month") {
      return currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } else {
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - day);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const startStr = startOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const endStr = endOfWeek.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${startStr} - ${endStr}`;
    }
  };

  // Navigate to previous/next period
  const navigatePeriod = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (period === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  // Check if we can navigate forward (not into the future)
  const canNavigateNext = useMemo(() => {
    const now = new Date();
    if (period === "month") {
      return (
        currentDate.getFullYear() < now.getFullYear() ||
        (currentDate.getFullYear() === now.getFullYear() &&
          currentDate.getMonth() < now.getMonth())
      );
    } else {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek <= now;
    }
  }, [currentDate, period]);

  // Check if we can navigate back (to first transaction)
  const canNavigatePrev = useMemo(() => {
    if (!report?.first_transaction_date) return true;
    const firstDate = new Date(report.first_transaction_date);
    if (period === "month") {
      return (
        currentDate.getFullYear() > firstDate.getFullYear() ||
        (currentDate.getFullYear() === firstDate.getFullYear() &&
          currentDate.getMonth() > firstDate.getMonth())
      );
    } else {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      return prevWeek >= firstDate;
    }
  }, [currentDate, period, report?.first_transaction_date]);

  // Fetch report data
  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      setSelectedCategory(null);
      try {
        const data = await reportsApi.get(period, getDateParam());
        setReport(data);
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [period, currentDate, getDateParam]);

  // Currency formatting
  const currencyInfo = CURRENCIES.find((c) => c.code === report?.currency);
  const symbol = currencyInfo?.symbol || "$";

  const formatCurrency = (amount: number) => {
    return `${symbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="min-h-screen bg-tertiary pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-tertiary/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              <span className="sr-only">Back</span>
            </Button>
            <h1 className="text-xl font-bold text-quaternary">Reports</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Period Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4">
            {/* Period Toggle */}
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-tertiary rounded-xl p-1">
                <button
                  onClick={() => setPeriod("month")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === "month"
                      ? "bg-primary text-tertiary"
                      : "text-quaternary/60 hover:text-quaternary"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setPeriod("week")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    period === "week"
                      ? "bg-primary text-tertiary"
                      : "text-quaternary/60 hover:text-quaternary"
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>

            {/* Period Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigatePeriod("prev")}
                disabled={!canNavigatePrev}
                className="p-2 rounded-lg hover:bg-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-quaternary" />
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-quaternary/60" />
                <span className="font-medium text-quaternary">
                  {getPeriodLabel()}
                </span>
              </div>

              <button
                onClick={() => navigatePeriod("next")}
                disabled={!canNavigateNext}
                className="p-2 rounded-lg hover:bg-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-5 h-5 text-quaternary" />
              </button>
            </div>
          </Card>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full"
            />
          </div>
        ) : (
          <>
            {/* Income & Expenses Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Income Card */}
              <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-success/10">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-sm text-quaternary/60">Income</span>
                </div>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(report?.total_income || 0)}
                </p>
              </Card>

              {/* Expenses Card */}
              <Card className="bg-gradient-to-br from-danger/10 to-transparent border-danger/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-danger/10">
                    <TrendingDown className="w-4 h-4 text-danger" />
                  </div>
                  <span className="text-sm text-quaternary/60">Expenses</span>
                </div>
                <p className="text-xl font-bold text-danger">
                  {formatCurrency(report?.total_expenses || 0)}
                </p>
              </Card>
            </motion.div>

            {/* Net Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {(() => {
                const net =
                  (report?.total_income || 0) - (report?.total_expenses || 0);
                const isPositive = net >= 0;
                return (
                  <Card
                    className={`bg-gradient-to-br ${
                      isPositive
                        ? "from-primary/10 to-transparent border-primary/20"
                        : "from-danger/10 to-transparent border-danger/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-3 rounded-xl ${
                            isPositive ? "bg-primary/10" : "bg-danger/10"
                          }`}
                        >
                          <Wallet
                            className={`w-5 h-5 ${
                              isPositive ? "text-primary" : "text-danger"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-sm text-quaternary/60">
                            Net {period === "month" ? "Monthly" : "Weekly"}
                          </p>
                          <p
                            className={`text-2xl font-bold ${
                              isPositive ? "text-primary" : "text-danger"
                            }`}
                          >
                            {isPositive ? "+" : "-"}
                            {formatCurrency(Math.abs(net))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })()}
            </motion.div>

            {/* Expenses Breakdown */}
            {report && report.expenses_by_category.length > 0 ? (
              <>
                {/* Donut Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-quaternary mb-4 text-center">
                      Expenses by Category
                    </h2>
                    <DonutChart
                      data={report.expenses_by_category}
                      total={report.total_expenses}
                      currency={report.currency}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                    />
                  </Card>
                </motion.div>

                {/* Category List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-lg font-semibold text-quaternary mb-4">
                    Category Details
                  </h2>
                  <CategoryBreakdown
                    data={report.expenses_by_category}
                    total={report.total_expenses}
                    currency={report.currency}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                  />
                </motion.div>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="text-center py-12">
                  <TrendingDown className="w-12 h-12 mx-auto text-quaternary/30 mb-4" />
                  <p className="text-quaternary/60">
                    No expenses recorded for this period
                  </p>
                </Card>
              </motion.div>
            )}

            {/* Currency Note */}
            {report && (
              <p className="text-xs text-quaternary/50 text-center">
                All values in {report.currency}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
