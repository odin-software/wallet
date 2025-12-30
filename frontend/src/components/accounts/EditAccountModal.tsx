import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Wallet } from "lucide-react";
import { BottomSheet, Button, Input } from "../ui";
import { accounts as accountsApi } from "../../api/client";
import type { Account } from "../../types";
import { ACCOUNT_COLORS, CURRENCIES } from "../../types";

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  onUpdated: (account: Account) => void;
}

type BalanceAdjustmentMode = "direct" | "transaction";

export function EditAccountModal({
  isOpen,
  onClose,
  account,
  onUpdated,
}: EditAccountModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(account.name);
  const [color, setColor] = useState(account.color);

  // Type-specific fields
  const [yearlyInterestRate, setYearlyInterestRate] = useState(
    account.yearly_interest_rate?.toString() || ""
  );
  const [creditLimit, setCreditLimit] = useState(
    account.credit_limit?.toString() || ""
  );
  const [monthlyPayment, setMonthlyPayment] = useState(
    account.monthly_payment?.toString() || ""
  );

  // Balance adjustment (only for asset accounts)
  const [balanceMode, setBalanceMode] =
    useState<BalanceAdjustmentMode>("direct");
  const [newBalance, setNewBalance] = useState(
    account.current_balance.toString()
  );
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentDescription, setAdjustmentDescription] = useState("");

  // Reset form when account changes
  useEffect(() => {
    setName(account.name);
    setColor(account.color);
    setYearlyInterestRate(account.yearly_interest_rate?.toString() || "");
    setCreditLimit(account.credit_limit?.toString() || "");
    setMonthlyPayment(account.monthly_payment?.toString() || "");
    setNewBalance(account.current_balance.toString());
    setAdjustmentAmount("");
    setAdjustmentDescription("");
    setError(null);
  }, [account]);

  const isAssetAccount = ["cash", "debit", "saving", "investment"].includes(
    account.type
  );

  const currencyInfo = CURRENCIES.find((c) => c.code === account.currency);
  const symbol = currencyInfo?.symbol || "$";

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build update data
      const updateData: Record<string, unknown> = {};

      if (name !== account.name) {
        updateData.name = name;
      }
      if (color !== account.color) {
        updateData.color = color;
      }

      // Type-specific updates
      if (
        (account.type === "saving" || account.type === "investment") &&
        yearlyInterestRate !== (account.yearly_interest_rate?.toString() || "")
      ) {
        updateData.yearly_interest_rate = parseFloat(yearlyInterestRate) || 0;
      }

      if (
        account.type === "credit_card" &&
        creditLimit !== (account.credit_limit?.toString() || "")
      ) {
        updateData.credit_limit = parseFloat(creditLimit) || 0;
      }

      if (
        account.type === "loan" &&
        monthlyPayment !== (account.monthly_payment?.toString() || "")
      ) {
        updateData.monthly_payment = parseFloat(monthlyPayment) || 0;
      }

      // Handle balance for asset accounts
      if (isAssetAccount) {
        if (balanceMode === "direct") {
          const newBalanceNum = parseFloat(newBalance) || 0;
          if (newBalanceNum !== account.current_balance) {
            updateData.current_balance = newBalanceNum;
          }
        } else if (balanceMode === "transaction" && adjustmentAmount) {
          const amount = parseFloat(adjustmentAmount);
          if (amount !== 0) {
            // Use the adjustment endpoint
            const adjustedAccount = await accountsApi.adjustBalance(
              account.id,
              amount,
              adjustmentDescription || undefined
            );
            onUpdated(adjustedAccount);
            onClose();
            return;
          }
        }
      }

      // Only call update if there are changes
      if (Object.keys(updateData).length > 0) {
        const updatedAccount = await accountsApi.update(account.id, updateData);
        onUpdated(updatedAccount);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Edit Account">
      <div className="space-y-6 pb-6">
        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-quaternary/60 uppercase tracking-wide">
            Basic Info
          </h3>

          <Input
            label="Account Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter account name"
          />

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-quaternary/80">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && (
                    <Check className="w-4 h-4 mx-auto text-tertiary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Type-Specific Fields */}
        {(account.type === "saving" || account.type === "investment") && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-quaternary/60 uppercase tracking-wide">
              Interest
            </h3>
            <Input
              label="Yearly Interest Rate (%)"
              type="number"
              step="0.01"
              value={yearlyInterestRate}
              onChange={(e) => setYearlyInterestRate(e.target.value)}
              placeholder="e.g., 5.5"
            />
          </div>
        )}

        {account.type === "credit_card" && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-quaternary/60 uppercase tracking-wide">
              Credit Card Details
            </h3>
            <Input
              label="Credit Limit"
              type="number"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="e.g., 50000"
            />
          </div>
        )}

        {account.type === "loan" && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-quaternary/60 uppercase tracking-wide">
              Loan Details
            </h3>
            <Input
              label="Monthly Payment"
              type="number"
              step="0.01"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              placeholder="e.g., 15000"
            />
          </div>
        )}

        {/* Balance Adjustment Section (only for asset accounts) */}
        {isAssetAccount && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-quaternary/60 uppercase tracking-wide">
              Balance Adjustment
            </h3>

            <div className="p-3 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-quaternary/60" />
                <span className="text-sm text-quaternary/60">
                  Current Balance:
                </span>
                <span className="font-semibold text-quaternary">
                  {symbol}
                  {account.current_balance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-tertiary rounded-lg p-1 mb-4">
                <button
                  type="button"
                  onClick={() => setBalanceMode("direct")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    balanceMode === "direct"
                      ? "bg-primary text-tertiary"
                      : "text-quaternary/60 hover:text-quaternary"
                  }`}
                >
                  Set Balance
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceMode("transaction")}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    balanceMode === "transaction"
                      ? "bg-primary text-tertiary"
                      : "text-quaternary/60 hover:text-quaternary"
                  }`}
                >
                  Adjustment
                </button>
              </div>

              {balanceMode === "direct" ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-quaternary/80">
                    New Balance
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-quaternary/50">
                      {symbol}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={newBalance}
                      onChange={(e) => setNewBalance(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-tertiary border border-border text-quaternary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-quaternary/50">
                    This will directly set the balance without creating a
                    transaction record.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-quaternary/80 mb-2">
                      Adjustment Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-quaternary/50">
                        {symbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={adjustmentAmount}
                        onChange={(e) => setAdjustmentAmount(e.target.value)}
                        placeholder="e.g., 500 or -200"
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-tertiary border border-border text-quaternary placeholder:text-quaternary/40 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                    </div>
                    <p className="text-xs text-quaternary/50 mt-1">
                      Use positive for deposit, negative for withdrawal.
                    </p>
                  </div>

                  <Input
                    label="Description (optional)"
                    value={adjustmentDescription}
                    onChange={(e) => setAdjustmentDescription(e.target.value)}
                    placeholder="e.g., Balance correction"
                  />

                  {adjustmentAmount && parseFloat(adjustmentAmount) !== 0 && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-quaternary">
                        New balance will be:{" "}
                        <span className="font-semibold">
                          {symbol}
                          {(
                            account.current_balance +
                            parseFloat(adjustmentAmount)
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          isLoading={isLoading}
          disabled={!name || isLoading}
          className="w-full"
        >
          Save Changes
        </Button>
      </div>
    </BottomSheet>
  );
}
