import { motion } from "framer-motion";
import {
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import type { Account } from "../../types";
import { ACCOUNT_TYPES, CURRENCIES } from "../../types";

interface AccountCardProps {
  account: Account;
}

const iconMap: Record<string, React.ElementType> = {
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  TrendingUp,
};

export function AccountCard({ account }: AccountCardProps) {
  const accountType = ACCOUNT_TYPES[account.type];
  const Icon = iconMap[accountType.icon] || Banknote;
  const currency = CURRENCIES.find((c) => c.code === account.currency);

  const getDisplayBalance = () => {
    switch (account.type) {
      case "credit_card":
        return account.credit_owed || 0;
      case "loan":
        return account.loan_current_owed || 0;
      default:
        return account.current_balance;
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = currency?.symbol || "$";
    return `${symbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const balance = getDisplayBalance();
  const isLiability = !accountType.isAsset;

  // Calculate credit card utilization
  const getUtilization = () => {
    if (account.type === "credit_card" && account.credit_limit) {
      return ((account.credit_owed || 0) / account.credit_limit) * 100;
    }
    return null;
  };

  // Calculate loan progress
  const getLoanProgress = () => {
    if (account.type === "loan" && account.loan_initial_amount) {
      const paid =
        account.loan_initial_amount - (account.loan_current_owed || 0);
      return (paid / account.loan_initial_amount) * 100;
    }
    return null;
  };

  const utilization = getUtilization();
  const loanProgress = getLoanProgress();

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      transition={{ duration: 0.15 }}
      className="relative overflow-hidden rounded-2xl bg-card border border-border p-5 md:p-5 cursor-pointer group"
      style={{
        borderColor: `${account.color}30`,
      }}
    >
      {/* Accent gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-1 opacity-80"
        style={{
          background: `linear-gradient(90deg, ${account.color}, ${account.color}80)`,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div
            className="p-2 md:p-2.5 rounded-xl flex-shrink-0"
            style={{ backgroundColor: `${account.color}15` }}
          >
            <Icon className="w-4 md:w-5 h-4 md:h-5" style={{ color: account.color }} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-quaternary text-sm md:text-base truncate">{account.name}</h3>
            <p className="text-xs md:text-sm text-quaternary/60 truncate">{accountType.label}</p>
          </div>
        </div>
        <ChevronRight className="w-4 md:w-5 h-4 md:h-5 text-quaternary/30 group-hover:text-quaternary/60 group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>

      {/* Balance */}
      <div className="mb-2 md:mb-3">
        <p className="text-xs md:text-sm text-quaternary/60 mb-0.5 md:mb-1">
          {isLiability ? "Amount Owed" : "Balance"}
        </p>
        <p
          className={`text-lg md:text-2xl font-bold ${
            isLiability ? "text-danger" : "text-quaternary"
          }`}
        >
          {isLiability && balance > 0 && "-"}
          {formatCurrency(balance)}
        </p>
      </div>

      {/* Credit card utilization bar - hide details on mobile */}
      {utilization !== null && (
        <div className="mt-3 md:mt-4">
          <div className="flex justify-between text-xs text-quaternary/60 mb-1">
            <span>Credit Used</span>
            <span className="hidden md:inline">{utilization.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(utilization, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                utilization > 80
                  ? "bg-danger"
                  : utilization > 50
                  ? "bg-warning"
                  : "bg-success"
              }`}
            />
          </div>
          <p className="text-xs text-quaternary/50 mt-1 hidden md:block">
            {formatCurrency(account.credit_owed || 0)} of{" "}
            {formatCurrency(account.credit_limit || 0)}
          </p>
        </div>
      )}

      {/* Loan progress bar - hide details on mobile */}
      {loanProgress !== null && (
        <div className="mt-3 md:mt-4">
          <div className="flex justify-between text-xs text-quaternary/60 mb-1">
            <span>Paid Off</span>
            <span className="hidden md:inline">{loanProgress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(loanProgress, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-success"
            />
          </div>
          {account.monthly_payment && (
            <p className="text-xs text-quaternary/50 mt-1 hidden md:block">
              {formatCurrency(account.monthly_payment)}/month
            </p>
          )}
        </div>
      )}

      {/* Interest rate badge for savings/investments - hide on mobile */}
      {(account.type === "saving" || account.type === "investment") &&
        account.yearly_interest_rate && (
          <div className="mt-2 md:mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium hidden md:inline-flex">
            <TrendingUp className="w-3.5 h-3.5" />
            {account.yearly_interest_rate}% APY
          </div>
        )}

      {/* Credit card closing date - hide on mobile */}
      {account.type === "credit_card" && account.closing_date && (
        <p className="text-xs text-quaternary/50 mt-2 hidden md:block">
          Closes on day {account.closing_date}
        </p>
      )}
    </motion.div>
  );
}
