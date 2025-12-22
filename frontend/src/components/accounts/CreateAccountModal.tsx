import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  TrendingUp,
  ChevronLeft,
  Check,
} from "lucide-react";
import { Modal, Button, Input } from "../ui";
import { accounts as accountsApi } from "../../api/client";
import type { Account, AccountType, CreateAccountRequest } from "../../types";
import { ACCOUNT_TYPES, ACCOUNT_COLORS, CURRENCIES } from "../../types";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (account: Account) => void;
}

const iconMap: Record<string, React.ElementType> = {
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  TrendingUp,
};

export function CreateAccountModal({
  isOpen,
  onClose,
  onCreated,
}: CreateAccountModalProps) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [currency, setCurrency] = useState("USD");

  // Type-specific fields
  const [initialBalance, setInitialBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [creditOwed, setCreditOwed] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [loanInitialAmount, setLoanInitialAmount] = useState("");
  const [loanCurrentOwed, setLoanCurrentOwed] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [yearlyInterestRate, setYearlyInterestRate] = useState("");

  const resetForm = () => {
    setStep(1);
    setAccountType(null);
    setName("");
    setColor(ACCOUNT_COLORS[0]);
    setCurrency("USD");
    setInitialBalance("");
    setCreditLimit("");
    setCreditOwed("");
    setClosingDate("");
    setLoanInitialAmount("");
    setLoanCurrentOwed("");
    setMonthlyPayment("");
    setYearlyInterestRate("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type: AccountType) => {
    setAccountType(type);
    setStep(2);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!accountType || !name) return;

    setIsLoading(true);
    setError(null);

    try {
      const data: CreateAccountRequest = {
        name,
        type: accountType,
        color,
        currency,
      };

      // Add type-specific fields
      switch (accountType) {
        case "cash":
        case "debit":
          if (initialBalance) data.initial_balance = parseFloat(initialBalance);
          break;
        case "credit_card":
          if (creditLimit) data.credit_limit = parseFloat(creditLimit);
          if (creditOwed) data.credit_owed = parseFloat(creditOwed);
          if (closingDate) data.closing_date = parseInt(closingDate);
          break;
        case "loan":
          if (loanInitialAmount)
            data.loan_initial_amount = parseFloat(loanInitialAmount);
          if (loanCurrentOwed)
            data.loan_current_owed = parseFloat(loanCurrentOwed);
          if (monthlyPayment) data.monthly_payment = parseFloat(monthlyPayment);
          break;
        case "saving":
        case "investment":
          if (initialBalance) data.initial_balance = parseFloat(initialBalance);
          if (yearlyInterestRate)
            data.yearly_interest_rate = parseFloat(yearlyInterestRate);
          break;
      }

      const account = await accountsApi.create(data);
      onCreated(account);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-4"
    >
      <p className="text-quaternary/60 text-sm mb-6">
        Choose the type of account you want to create
      </p>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(ACCOUNT_TYPES) as AccountType[]).map((type) => {
          const info = ACCOUNT_TYPES[type];
          const Icon = iconMap[info.icon] || Banknote;
          return (
            <motion.button
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTypeSelect(type)}
              className={`
                p-4 rounded-xl border text-left transition-all
                ${
                  accountType === type
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-card"
                }
              `}
            >
              <Icon
                className={`w-6 h-6 mb-2 ${
                  accountType === type ? "text-primary" : "text-quaternary/60"
                }`}
              />
              <p className="font-medium text-quaternary">{info.label}</p>
              <p className="text-xs text-quaternary/50 mt-0.5">
                {info.isAsset ? "Asset" : "Liability"}
              </p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <Input
        label="Account Name"
        placeholder="e.g., Main Checking"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      {/* Color picker */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-quaternary/80">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-9 h-9 rounded-full transition-all ${
                color === c
                  ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            >
              {color === c && (
                <Check
                  className="w-4 h-4 mx-auto"
                  style={{
                    color:
                      c === "#DDE61F" || c === "#D6D7D5" ? "#0F1822" : "#fff",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Currency selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-quaternary/80">
          Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-card border border-border text-quaternary focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.code} - {c.name}
            </option>
          ))}
        </select>
      </div>

      <Button onClick={() => setStep(3)} className="w-full" disabled={!name}>
        Continue
      </Button>
    </motion.div>
  );

  const renderStep3 = () => {
    const renderTypeFields = () => {
      switch (accountType) {
        case "cash":
        case "debit":
          return (
            <Input
              label="Initial Balance"
              type="number"
              placeholder="0.00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          );

        case "credit_card":
          return (
            <>
              <Input
                label="Credit Limit"
                type="number"
                placeholder="0.00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
              <Input
                label="Current Balance Owed"
                type="number"
                placeholder="0.00"
                value={creditOwed}
                onChange={(e) => setCreditOwed(e.target.value)}
              />
              <Input
                label="Statement Closing Date"
                type="number"
                placeholder="Day of month (1-31)"
                min="1"
                max="31"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
              />
            </>
          );

        case "loan":
          return (
            <>
              <Input
                label="Original Loan Amount"
                type="number"
                placeholder="0.00"
                value={loanInitialAmount}
                onChange={(e) => setLoanInitialAmount(e.target.value)}
              />
              <Input
                label="Current Balance Owed"
                type="number"
                placeholder="0.00"
                value={loanCurrentOwed}
                onChange={(e) => setLoanCurrentOwed(e.target.value)}
              />
              <Input
                label="Monthly Payment"
                type="number"
                placeholder="0.00"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
              />
            </>
          );

        case "saving":
        case "investment":
          return (
            <>
              <Input
                label="Current Balance"
                type="number"
                placeholder="0.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
              <Input
                label="Yearly Interest Rate (%)"
                type="number"
                step="0.01"
                placeholder="e.g., 4.5"
                value={yearlyInterestRate}
                onChange={(e) => setYearlyInterestRate(e.target.value)}
              />
            </>
          );

        default:
          return null;
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        <p className="text-quaternary/60 text-sm">
          {accountType && ACCOUNT_TYPES[accountType].label} details
        </p>

        {renderTypeFields()}

        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
            {error}
          </div>
        )}

        <Button onClick={handleSubmit} isLoading={isLoading} className="w-full">
          Create Account
        </Button>
      </motion.div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 1
          ? "Create Account"
          : step === 2
          ? "Account Details"
          : "Final Details"
      }
      size="md"
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Back button */}
      {step > 1 && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-quaternary/60 hover:text-quaternary mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </AnimatePresence>
    </Modal>
  );
}
