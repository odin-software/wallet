import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User as UserIcon,
  Globe,
  Save,
  Check,
  DollarSign,
  Plus,
  X,
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
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { user as userApi, budgets as budgetsApi } from "../api/client";
import { Button, Card, Input } from "../components/ui";
import { CURRENCIES, CATEGORIES, type TransactionCategory } from "../types";

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
  income: User,
  transfer: User,
  other: MoreHorizontal,
};

export function Settings() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [preferredCurrency, setPreferredCurrency] = useState(
    user?.preferred_currency || "DOP"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Budget state
  const [budgets, setBudgets] = useState<Record<string, string>>({});
  const [originalBudgets, setOriginalBudgets] = useState<
    Record<string, string>
  >({});
  const [budgetsLoading, setBudgetsLoading] = useState(true);
  const [showAddBudget, setShowAddBudget] = useState(false);

  // Expense categories only (exclude income, transfer)
  const expenseCategories = Object.keys(CATEGORIES).filter(
    (cat) => cat !== "income" && cat !== "transfer"
  ) as TransactionCategory[];

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPreferredCurrency(user.preferred_currency || "DOP");
    }
  }, [user]);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const budgetsData = await budgetsApi.list();
      const budgetsMap: Record<string, string> = {};
      budgetsData.forEach((budget) => {
        budgetsMap[budget.category] = budget.monthly_limit.toString();
      });
      setBudgets(budgetsMap);
      setOriginalBudgets(budgetsMap);
    } catch (err) {
      console.error("Failed to fetch budgets:", err);
    } finally {
      setBudgetsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      // Save user preferences
      await userApi.updatePreferences({
        name: name || undefined,
        preferred_currency: preferredCurrency,
      });
      await refreshUser();

      // Save budgets
      const budgetPromises = Object.entries(budgets).map(
        ([category, limit]) => {
          const amount = parseFloat(limit);
          if (!isNaN(amount) && amount > 0) {
            return budgetsApi.set(category, amount);
          }
          return Promise.resolve();
        }
      );
      await Promise.all(budgetPromises);

      // Update original budgets to reflect saved state
      setOriginalBudgets(budgets);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBudget = (category: TransactionCategory) => {
    setBudgets((prev) => ({ ...prev, [category]: "" }));
    setShowAddBudget(false);
  };

  const handleRemoveBudget = async (category: string) => {
    try {
      await budgetsApi.delete(category);
      setBudgets((prev) => {
        const newBudgets = { ...prev };
        delete newBudgets[category];
        return newBudgets;
      });
      setOriginalBudgets((prev) => {
        const newBudgets = { ...prev };
        delete newBudgets[category];
        return newBudgets;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove budget");
    }
  };

  // Check if budgets have changed
  const budgetsChanged = () => {
    const currentKeys = Object.keys(budgets);
    const originalKeys = Object.keys(originalBudgets);

    if (currentKeys.length !== originalKeys.length) return true;

    for (const key of currentKeys) {
      if (budgets[key] !== originalBudgets[key]) return true;
    }

    return false;
  };

  const hasChanges =
    name !== (user?.name || "") ||
    preferredCurrency !== (user?.preferred_currency || "DOP") ||
    budgetsChanged();

  return (
    <div className="min-h-screen bg-tertiary">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-tertiary/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          <h1 className="text-xl font-bold text-quaternary">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-primary/10">
                <UserIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-quaternary">
                  Profile
                </h2>
                <p className="text-sm text-quaternary/60">
                  Manage your account settings
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-quaternary/80">
                  Email
                </label>
                <div className="w-full py-3 px-4 rounded-xl bg-tertiary border border-border text-quaternary/60">
                  {user?.email}
                </div>
              </div>

              {/* Name */}
              <Input
                label="Display Name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<UserIcon className="w-5 h-5" />}
              />
            </div>
          </Card>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Globe className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-quaternary">
                  Preferences
                </h2>
                <p className="text-sm text-quaternary/60">
                  Customize your experience
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Preferred Currency */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-quaternary/80">
                  Preferred Currency
                </label>
                <p className="text-xs text-quaternary/50 mb-2">
                  Financial overview will be displayed in this currency
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {CURRENCIES.map((currency) => (
                    <motion.button
                      key={currency.code}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setPreferredCurrency(currency.code)}
                      className={`
                        relative p-4 rounded-xl border text-center transition-all
                        ${
                          preferredCurrency === currency.code
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-card"
                        }
                      `}
                    >
                      {preferredCurrency === currency.code && (
                        <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                      )}
                      <p className="text-lg font-bold text-quaternary">
                        {currency.symbol}
                      </p>
                      <p className="text-xs text-quaternary/60 mt-1">
                        {currency.code}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Budget Limits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-success/10">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-quaternary">
                  Budget Limits
                </h2>
                <p className="text-sm text-quaternary/60">
                  Set monthly spending limits for categories
                </p>
              </div>
            </div>

            {budgetsLoading ? (
              <div className="text-center py-8 text-quaternary/60">
                Loading budgets...
              </div>
            ) : (
              <div className="space-y-4">
                {/* Existing budgets */}
                {Object.entries(budgets).map(([category, limit]) => {
                  const Icon = categoryIcons[category as TransactionCategory];
                  const label =
                    CATEGORIES[category as TransactionCategory]?.label ||
                    category;
                  const currencySymbol =
                    CURRENCIES.find((c) => c.code === preferredCurrency)
                      ?.symbol || "$";

                  return (
                    <div
                      key={category}
                      className="flex items-center gap-3 p-3 rounded-xl bg-tertiary border border-border"
                    >
                      <div className="p-2 rounded-lg bg-card">
                        <Icon className="w-5 h-5 text-quaternary/60" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-quaternary">
                          {label}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-quaternary/50">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={limit}
                          onChange={(e) =>
                            setBudgets((prev) => ({
                              ...prev,
                              [category]: e.target.value,
                            }))
                          }
                          className="w-28 px-3 py-2 rounded-lg bg-card border border-border text-quaternary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                        />
                        <button
                          onClick={() => handleRemoveBudget(category)}
                          className="p-2 rounded-lg text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add budget dropdown */}
                {showAddBudget ? (
                  <div className="p-3 rounded-xl bg-tertiary border border-border space-y-2">
                    <p className="text-sm font-medium text-quaternary mb-2">
                      Select a category
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {expenseCategories
                        .filter((cat) => !budgets[cat])
                        .map((category) => {
                          const Icon = categoryIcons[category];
                          const label = CATEGORIES[category].label;
                          return (
                            <button
                              key={category}
                              onClick={() => handleAddBudget(category)}
                              className="flex items-center gap-2 p-2 rounded-lg bg-card hover:bg-border transition-colors text-left"
                            >
                              <Icon className="w-4 h-4 text-quaternary/60" />
                              <span className="text-sm text-quaternary">
                                {label}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setShowAddBudget(false)}
                      className="w-full mt-2 py-2 text-sm text-quaternary/60 hover:text-quaternary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  Object.keys(budgets).length < expenseCategories.length && (
                    <button
                      onClick={() => setShowAddBudget(true)}
                      className="w-full p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-card transition-colors flex items-center justify-center gap-2 text-quaternary/60 hover:text-primary"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm font-medium">Add Budget</span>
                    </button>
                  )
                )}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!hasChanges || isSaving}
            icon={
              saveSuccess ? (
                <Check className="w-5 h-5" />
              ) : (
                <Save className="w-5 h-5" />
              )
            }
            className="w-full"
          >
            {saveSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
