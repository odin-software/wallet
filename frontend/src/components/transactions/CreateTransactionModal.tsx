import { useState, useEffect } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
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
  Check,
} from "lucide-react";
import { BottomSheet, Button, Input } from "../ui";
import {
  transactions as transactionsApi,
  transfers as transfersApi,
  exchangeRates as exchangeApi,
} from "../../api/client";
import type {
  Account,
  Transaction,
  TransactionType,
  TransactionCategory,
  CreateTransactionRequest,
} from "../../types";
import { CATEGORIES, CURRENCIES, ACCOUNT_TYPES } from "../../types";

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  preselectedAccountId?: number;
  onCreated: (transaction: Transaction) => void;
}

type TransactionMode = "regular" | "transfer";

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

export function CreateTransactionModal({
  isOpen,
  onClose,
  accounts,
  preselectedAccountId,
  onCreated,
}: CreateTransactionModalProps) {
  const [mode, setMode] = useState<TransactionMode>("regular");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    preselectedAccountId || null
  );
  const [destinationAccountId, setDestinationAccountId] = useState<
    number | null
  >(null);
  const [transactionType, setTransactionType] =
    useState<TransactionType | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("other");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const destinationAccount = accounts.find(
    (a) => a.id === destinationAccountId
  );
  const currency = selectedAccount
    ? CURRENCIES.find((c) => c.code === selectedAccount.currency)
    : null;
  const symbol = currency?.symbol || "$";

  // Get destination currency info
  const destCurrency = destinationAccount
    ? CURRENCIES.find((c) => c.code === destinationAccount.currency)
    : null;
  const destSymbol = destCurrency?.symbol || "$";

  // Check if cross-currency transfer
  const isCrossCurrency =
    mode === "transfer" &&
    selectedAccount &&
    destinationAccount &&
    selectedAccount.currency !== destinationAccount.currency;

  // Reset transaction type when account changes
  useEffect(() => {
    setTransactionType(null);
    setDestinationAccountId(null);
    setConvertedAmount(null);
  }, [selectedAccountId]);

  // Update preselected account when prop changes
  useEffect(() => {
    if (preselectedAccountId) {
      setSelectedAccountId(preselectedAccountId);
    }
  }, [preselectedAccountId]);

  // Fetch converted amount for cross-currency transfers
  useEffect(() => {
    if (isCrossCurrency && amount && selectedAccount && destinationAccount) {
      const amountNum = parseFloat(amount);
      if (!isNaN(amountNum) && amountNum > 0) {
        exchangeApi
          .convert(
            selectedAccount.currency,
            destinationAccount.currency,
            amountNum
          )
          .then((result) => {
            setConvertedAmount(result.converted);
          })
          .catch(() => {
            setConvertedAmount(null);
          });
      }
    } else {
      setConvertedAmount(null);
    }
  }, [isCrossCurrency, amount, selectedAccount, destinationAccount]);

  // Filter accounts for transfer destination
  const getDestinationAccounts = () => {
    if (!selectedAccount) return [];
    // Source must be asset, destination can be anything except same account
    return accounts.filter((a) => a.id !== selectedAccountId);
  };

  // Check if account is asset type
  const isAssetAccount = (account: Account) => {
    return ["cash", "debit", "saving", "investment"].includes(account.type);
  };

  // Determine available transaction types based on account type
  const getAvailableTypes = (): {
    type: TransactionType;
    label: string;
    icon: React.ElementType;
  }[] => {
    if (!selectedAccount) return [];

    switch (selectedAccount.type) {
      case "cash":
      case "debit":
      case "saving":
      case "investment":
        return [
          { type: "deposit", label: "Deposit", icon: ArrowUpCircle },
          { type: "withdrawal", label: "Withdrawal", icon: ArrowDownCircle },
        ];
      case "credit_card":
        return [
          { type: "expense", label: "Expense", icon: ArrowDownCircle },
          { type: "payment", label: "Payment", icon: ArrowUpCircle },
        ];
      case "loan":
        return [{ type: "payment", label: "Payment", icon: ArrowUpCircle }];
      default:
        return [];
    }
  };

  const availableTypes = getAvailableTypes();
  const destinationAccounts = getDestinationAccounts();

  // Only show transfer option if source is asset account
  const canTransfer = selectedAccount && isAssetAccount(selectedAccount);

  const resetForm = () => {
    if (!preselectedAccountId) {
      setSelectedAccountId(null);
    }
    setMode("regular");
    setDestinationAccountId(null);
    setTransactionType(null);
    setAmount("");
    setDescription("");
    setCategory("other");
    setError(null);
    setConvertedAmount(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPreviewBalance = () => {
    if (!selectedAccount || !amount) return null;
    if (mode === "transfer" && !destinationAccountId) return null;
    if (mode === "regular" && !transactionType) return null;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) return null;

    let currentBalance: number;
    switch (selectedAccount.type) {
      case "credit_card":
        currentBalance = selectedAccount.credit_owed || 0;
        break;
      case "loan":
        currentBalance = selectedAccount.loan_current_owed || 0;
        break;
      default:
        currentBalance = selectedAccount.current_balance;
    }

    if (mode === "transfer") {
      // Transfer always withdraws from source
      return currentBalance - amountNum;
    }

    switch (transactionType) {
      case "deposit":
        return currentBalance + amountNum;
      case "withdrawal":
        return currentBalance - amountNum;
      case "expense":
        return currentBalance + amountNum;
      case "payment":
        return currentBalance - amountNum;
      default:
        return currentBalance;
    }
  };

  const handleSubmit = async () => {
    if (!selectedAccount || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === "transfer") {
        if (!destinationAccountId) {
          setError("Please select a destination account");
          return;
        }

        const result = await transfersApi.create({
          from_account_id: selectedAccount.id,
          to_account_id: destinationAccountId,
          amount: amountNum,
          description: description || undefined,
        });

        // Handle response - it might be Transaction or TransferResponse
        const transaction =
          "transaction" in result ? result.transaction : result;
        onCreated(transaction as Transaction);
      } else {
        if (!transactionType) {
          setError("Please select a transaction type");
          return;
        }

        const data: CreateTransactionRequest = {
          type: transactionType,
          amount: amountNum,
          description,
          category,
        };

        const transaction = await transactionsApi.create(
          selectedAccount.id,
          data
        );
        onCreated(transaction);
      }
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create transaction"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const previewBalance = getPreviewBalance();

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Add Transaction">
      <div className="space-y-6">
        {/* Account Selector - Inline list for mobile */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-quaternary/80">
            {mode === "transfer" ? "From Account" : "Select Account"}
          </label>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {accounts.map((account) => {
              const isSelected = account.id === selectedAccountId;
              const accountCurrency = CURRENCIES.find(
                (c) => c.code === account.currency
              );
              const accountSymbol = accountCurrency?.symbol || "$";
              const balance =
                account.type === "credit_card"
                  ? account.credit_owed || 0
                  : account.type === "loan"
                  ? account.loan_current_owed || 0
                  : account.current_balance;

              // For transfer mode, only show asset accounts as source
              if (mode === "transfer" && !isAssetAccount(account)) {
                return null;
              }

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setSelectedAccountId(account.id)}
                  className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                    isSelected
                      ? "bg-primary/15 border-2 border-primary"
                      : "bg-card border-2 border-border hover:border-quaternary/30 active:scale-[0.98]"
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: account.color }}
                  />
                  <div className="flex-1 text-left min-w-0">
                    <p
                      className={`font-medium truncate ${
                        isSelected ? "text-primary" : "text-quaternary"
                      }`}
                    >
                      {account.name}
                    </p>
                    <p className="text-sm text-quaternary/50">
                      {ACCOUNT_TYPES[account.type].label} · {accountSymbol}
                      {balance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode Toggle - only show when account is selected and is asset */}
        {selectedAccount && canTransfer && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-quaternary/80">
              Transaction Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode("regular");
                  setDestinationAccountId(null);
                }}
                className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                  mode === "regular"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-quaternary/30"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    mode === "regular" ? "text-primary" : "text-quaternary/60"
                  }`}
                >
                  Regular
                </p>
              </button>
              <button
                onClick={() => {
                  setMode("transfer");
                  setTransactionType(null);
                }}
                className={`flex-1 p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  mode === "transfer"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-quaternary/30"
                }`}
              >
                <ArrowLeftRight
                  className={`w-4 h-4 ${
                    mode === "transfer" ? "text-primary" : "text-quaternary/60"
                  }`}
                />
                <p
                  className={`text-sm font-medium ${
                    mode === "transfer" ? "text-primary" : "text-quaternary/60"
                  }`}
                >
                  Transfer
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Destination Account Selector - for transfer mode */}
        {mode === "transfer" && selectedAccount && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-quaternary/80">
              To Account
            </label>
            <div className="grid gap-2 max-h-48 overflow-y-auto">
              {destinationAccounts.map((account) => {
                const isSelected = account.id === destinationAccountId;
                const accountCurrency = CURRENCIES.find(
                  (c) => c.code === account.currency
                );
                const accountSymbol = accountCurrency?.symbol || "$";
                const balance =
                  account.type === "credit_card"
                    ? account.credit_owed || 0
                    : account.type === "loan"
                    ? account.loan_current_owed || 0
                    : account.current_balance;
                const isLiability = !ACCOUNT_TYPES[account.type].isAsset;

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setDestinationAccountId(account.id)}
                    className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-all ${
                      isSelected
                        ? "bg-primary/15 border-2 border-primary"
                        : "bg-card border-2 border-border hover:border-quaternary/30 active:scale-[0.98]"
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: account.color }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p
                        className={`font-medium truncate ${
                          isSelected ? "text-primary" : "text-quaternary"
                        }`}
                      >
                        {account.name}
                      </p>
                      <p className="text-sm text-quaternary/50">
                        {ACCOUNT_TYPES[account.type].label}
                        {isLiability ? " (Payment)" : ""} · {accountSymbol}
                        {balance.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction Type Toggle - only show for regular mode */}
        {mode === "regular" && selectedAccount && availableTypes.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-quaternary/80">
              Type
            </label>
            <div className="flex gap-2">
              {availableTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => setTransactionType(type)}
                  className={`
                    flex-1 p-4 rounded-xl border-2 transition-all
                    ${
                      transactionType === type
                        ? type === "deposit" || type === "payment"
                          ? "border-success bg-success/10"
                          : "border-danger bg-danger/10"
                        : "border-border hover:border-quaternary/30"
                    }
                  `}
                >
                  <Icon
                    className={`w-6 h-6 mx-auto mb-2 ${
                      transactionType === type
                        ? type === "deposit" || type === "payment"
                          ? "text-success"
                          : "text-danger"
                        : "text-quaternary/50"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      transactionType === type
                        ? "text-quaternary"
                        : "text-quaternary/60"
                    }`}
                  >
                    {label}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount Input - show when ready */}
        {((mode === "regular" && transactionType) ||
          (mode === "transfer" && destinationAccountId)) && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-quaternary/80">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl text-quaternary/50 pointer-events-none">
                  {symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-16 pr-4 py-4 text-2xl font-semibold rounded-xl bg-card border border-border text-quaternary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              {/* Cross-currency conversion preview */}
              {isCrossCurrency && convertedAmount !== null && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <p className="text-sm text-quaternary">
                    Destination will receive:{" "}
                    <span className="font-semibold text-primary">
                      {destSymbol}
                      {convertedAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </p>
                </div>
              )}

              {previewBalance !== null && (
                <p className="text-sm text-quaternary/50">
                  New balance:{" "}
                  <span
                    className={`font-medium ${
                      mode === "transfer" ||
                      transactionType === "withdrawal" ||
                      transactionType === "expense"
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {symbol}
                    {previewBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
              )}
            </div>

            {/* Category Selector - only for regular mode */}
            {mode === "regular" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-quaternary/80">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto py-1">
                  {(Object.keys(CATEGORIES) as TransactionCategory[]).map(
                    (cat) => {
                      const Icon = categoryIcons[cat];
                      return (
                        <button
                          key={cat}
                          onClick={() => setCategory(cat)}
                          className={`
                        p-2 rounded-xl transition-all flex flex-col items-center gap-1
                        ${
                          category === cat
                            ? "bg-primary/20 border-2 border-primary"
                            : "bg-card border border-border hover:border-quaternary/30"
                        }
                      `}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              category === cat
                                ? "text-primary"
                                : "text-quaternary/60"
                            }`}
                          />
                          <span
                            className={`text-[10px] ${
                              category === cat
                                ? "text-primary font-medium"
                                : "text-quaternary/50"
                            }`}
                          >
                            {CATEGORIES[cat].label}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <Input
              label="Description (optional)"
              placeholder={
                mode === "transfer"
                  ? "e.g., Monthly savings"
                  : "e.g., Grocery shopping at Costco"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
            />
          </>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={
            !selectedAccount ||
            !amount ||
            (mode === "regular" && !transactionType) ||
            (mode === "transfer" && !destinationAccountId)
          }
          className="w-full"
          size="lg"
        >
          {mode === "transfer" ? "Transfer" : "Add Transaction"}
        </Button>
      </div>
    </BottomSheet>
  );
}
