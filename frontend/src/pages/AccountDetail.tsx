import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Plus,
  Trash2,
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  accounts as accountsApi,
  transactions as transactionsApi,
} from "../api/client";
import { Button, Card, Modal } from "../components/ui";
import { CreateTransactionModal } from "../components/transactions/CreateTransactionModal";
import { TransactionList } from "../components/transactions/TransactionList";
import type { Account, Transaction, TransactionListResponse } from "../types";
import { ACCOUNT_TYPES, CURRENCIES } from "../types";

const iconMap: Record<string, React.ElementType> = {
  Banknote,
  CreditCard,
  FileText,
  PiggyBank,
  TrendingUp,
};

export function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const accountId = parseInt(id || "0");

  const fetchAccount = useCallback(async () => {
    try {
      const data = await accountsApi.get(accountId);
      setAccount(data);
    } catch (error) {
      console.error("Failed to fetch account:", error);
      navigate("/");
    }
  }, [accountId, navigate]);

  const fetchTransactions = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (append) setIsLoadingMore(true);
        const response: TransactionListResponse =
          await transactionsApi.listByAccount(accountId, pageNum, 20);
        if (append) {
          setTransactions((prev) => [...prev, ...response.transactions]);
        } else {
          setTransactions(response.transactions);
        }
        setTotalTransactions(response.total);
        setPage(pageNum);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setIsLoadingMore(false);
      }
    },
    [accountId]
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAccount(), fetchTransactions(1)]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchAccount, fetchTransactions]);

  const handleTransactionCreated = (tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev]);
    setTotalTransactions((prev) => prev + 1);
    fetchAccount(); // Refresh account balance
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && transactions.length < totalTransactions) {
      fetchTransactions(page + 1, true);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    setIsDeleting(true);
    try {
      await accountsApi.delete(account.id);
      navigate("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || !account) {
    return (
      <div className="min-h-screen bg-tertiary flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
        />
      </div>
    );
  }

  const accountType = ACCOUNT_TYPES[account.type];
  const Icon = iconMap[accountType.icon] || Banknote;
  const currency = CURRENCIES.find((c) => c.code === account.currency);

  const formatCurrency = (amount: number) => {
    const symbol = currency?.symbol || "$";
    return `${symbol}${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

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

  const balance = getDisplayBalance();
  const isLiability = !accountType.isAsset;

  return (
    <div className="min-h-screen bg-tertiary pb-24">
      {/* Header */}
      <header
        className="relative pt-4 pb-8 px-4"
        style={{
          background: `linear-gradient(180deg, ${account.color}15 0%, transparent 100%)`,
        }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-quaternary/60 hover:text-quaternary transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 rounded-lg text-quaternary/60 hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Account info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-4"
          >
            <div
              className="p-4 rounded-2xl"
              style={{ backgroundColor: `${account.color}20` }}
            >
              <Icon className="w-8 h-8" style={{ color: account.color }} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-quaternary">
                {account.name}
              </h1>
              <p className="text-quaternary/60">{accountType.label}</p>
            </div>
          </motion.div>

          {/* Balance card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card variant="elevated" className="mt-6">
              <p className="text-sm text-quaternary/60 mb-1">
                {isLiability ? "Amount Owed" : "Current Balance"}
              </p>
              <p
                className={`text-4xl font-bold ${
                  isLiability ? "text-danger" : "text-quaternary"
                }`}
              >
                {isLiability && balance > 0 && "-"}
                {formatCurrency(balance)}
              </p>

              {/* Type-specific info */}
              {account.type === "credit_card" && account.credit_limit && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-quaternary/60 mb-2">
                    <span>Credit Used</span>
                    <span>
                      {formatCurrency(account.credit_owed || 0)} /{" "}
                      {formatCurrency(account.credit_limit)}
                    </span>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          ((account.credit_owed || 0) / account.credit_limit) *
                            100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={`h-full rounded-full ${
                        ((account.credit_owed || 0) / account.credit_limit) *
                          100 >
                        80
                          ? "bg-danger"
                          : ((account.credit_owed || 0) /
                              account.credit_limit) *
                              100 >
                            50
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                    />
                  </div>
                </div>
              )}

              {account.type === "loan" && account.loan_initial_amount && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-quaternary/60 mb-2">
                    <span>Paid Off</span>
                    <span>
                      {formatCurrency(
                        account.loan_initial_amount -
                          (account.loan_current_owed || 0)
                      )}{" "}
                      / {formatCurrency(account.loan_initial_amount)}
                    </span>
                  </div>
                  <div className="h-3 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(
                          ((account.loan_initial_amount -
                            (account.loan_current_owed || 0)) /
                            account.loan_initial_amount) *
                            100,
                          100
                        )}%`,
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full bg-success"
                    />
                  </div>
                  {account.monthly_payment && (
                    <p className="text-sm text-quaternary/50 mt-2">
                      Monthly payment: {formatCurrency(account.monthly_payment)}
                    </p>
                  )}
                </div>
              )}

              {(account.type === "saving" || account.type === "investment") &&
                account.yearly_interest_rate && (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                    <TrendingUp className="w-4 h-4" />
                    {account.yearly_interest_rate}% APY
                  </div>
                )}
            </Card>
          </motion.div>
        </div>
      </header>

      {/* Transactions */}
      <main className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-quaternary">
            Transactions
          </h2>
          <Button
            size="sm"
            onClick={() => setShowTransactionModal(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add
          </Button>
        </div>

        {transactions.length === 0 ? (
          <Card className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-border flex items-center justify-center mb-4">
              {isLiability ? (
                <ArrowDownCircle className="w-8 h-8 text-quaternary/30" />
              ) : (
                <ArrowUpCircle className="w-8 h-8 text-quaternary/30" />
              )}
            </div>
            <h3 className="text-lg font-medium text-quaternary mb-2">
              No transactions yet
            </h3>
            <p className="text-quaternary/60 mb-6">
              Add your first transaction to start tracking
            </p>
            <Button
              onClick={() => setShowTransactionModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Transaction
            </Button>
          </Card>
        ) : (
          <>
            <TransactionList
              transactions={transactions}
              currency={account.currency}
            />

            {transactions.length < totalTransactions && (
              <div className="mt-4 text-center">
                <Button
                  variant="ghost"
                  onClick={handleLoadMore}
                  isLoading={isLoadingMore}
                >
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowTransactionModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center"
        style={{ backgroundColor: account.color }}
      >
        <Plus
          className="w-6 h-6"
          style={{
            color:
              account.color === "#DDE61F" || account.color === "#D6D7D5"
                ? "#0F1822"
                : "#fff",
          }}
        />
      </motion.button>

      {/* Create Transaction Modal */}
      <CreateTransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        accounts={[account]}
        preselectedAccountId={account.id}
        onCreated={handleTransactionCreated}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
        size="sm"
      >
        <p className="text-quaternary/80 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-quaternary">{account.name}</span>?
          This action cannot be undone and will delete all associated
          transactions.
        </p>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
            className="flex-1"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
