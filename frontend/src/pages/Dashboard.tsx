import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Wallet, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  accounts as accountsApi,
  transactions as transactionsApi,
} from "../api/client";
import { Button, Card } from "../components/ui";
import { AccountCard } from "../components/accounts/AccountCard";
import { CreateAccountModal } from "../components/accounts/CreateAccountModal";
import { CreateTransactionModal } from "../components/transactions/CreateTransactionModal";
import type { Account, FinancialOverview, Transaction } from "../types";
import { CURRENCIES } from "../types";

export function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateTransactionModal, setShowCreateTransactionModal] =
    useState(false);

  const fetchData = async () => {
    try {
      const [accountsData, overviewData, transactionsData] = await Promise.all([
        accountsApi.list(),
        accountsApi.overview(),
        transactionsApi.recent(5),
      ]);
      setAccounts(accountsData);
      setOverview(overviewData);
      setRecentTransactions(transactionsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleAccountCreated = (newAccount: Account) => {
    setAccounts((prev) => [newAccount, ...prev]);
    fetchData(); // Refresh overview
  };

  const handleTransactionCreated = () => {
    fetchData(); // Refresh everything including overview and recent transactions
  };

  const formatCurrency = (
    amount: number,
    currency = "USD",
    preserveSign = false
  ) => {
    const curr = CURRENCIES.find((c) => c.code === currency);
    const symbol = curr?.symbol || "$";
    const isNegative = amount < 0;
    const absValue = Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (preserveSign && isNegative) {
      return `-${symbol}${absValue}`;
    }
    return `${symbol}${absValue}`;
  };

  if (isLoading) {
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

  return (
    <div className="min-h-screen bg-tertiary pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-tertiary/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Odin</span>
              <span className="text-quaternary"> Wallet</span>
            </h1>
            <p className="text-sm text-quaternary/60">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Financial Overview */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {/* Net Worth */}
            <Card
              variant="elevated"
              className={`md:col-span-1 bg-gradient-to-br ${
                (overview?.net_worth || 0) >= 0
                  ? "from-card to-tertiary"
                  : "from-danger/10 to-tertiary border-danger/20"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-3 rounded-xl ${
                    (overview?.net_worth || 0) >= 0
                      ? "bg-primary/10"
                      : "bg-danger/10"
                  }`}
                >
                  <Wallet
                    className={`w-6 h-6 ${
                      (overview?.net_worth || 0) >= 0
                        ? "text-primary"
                        : "text-danger"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-sm text-quaternary/60">Net Worth</p>
                  <p
                    className={`text-2xl font-bold ${
                      (overview?.net_worth || 0) >= 0
                        ? "text-quaternary"
                        : "text-danger"
                    }`}
                  >
                    {formatCurrency(overview?.net_worth || 0, "USD", true)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Assets */}
            <Card className="bg-gradient-to-br from-success/10 to-transparent border-success/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/10">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-quaternary/60">Total Assets</p>
                  <p className="text-xl font-bold text-success">
                    {formatCurrency(overview?.total_assets || 0)}
                  </p>
                </div>
              </div>
            </Card>

            {/* Total Liabilities */}
            <Card className="bg-gradient-to-br from-danger/10 to-transparent border-danger/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-danger/10">
                  <TrendingDown className="w-6 h-6 text-danger" />
                </div>
                <div>
                  <p className="text-sm text-quaternary/60">
                    Total Liabilities
                  </p>
                  <p className="text-xl font-bold text-danger">
                    {formatCurrency(overview?.total_liabilities || 0)}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </section>

        {/* Accounts */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-quaternary">Accounts</h2>
            <Button
              size="sm"
              onClick={() => setShowCreateAccountModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <Card className="text-center py-12">
              <Wallet className="w-16 h-16 mx-auto text-quaternary/30 mb-4" />
              <h3 className="text-lg font-medium text-quaternary mb-2">
                No accounts yet
              </h3>
              <p className="text-quaternary/60 mb-6">
                Create your first account to start tracking your finances
              </p>
              <Button
                onClick={() => setShowCreateAccountModal(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                Create Account
              </Button>
            </Card>
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {accounts.map((account) => (
                  <motion.div
                    key={account.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    layout
                  >
                    <Link to={`/accounts/${account.id}`}>
                      <AccountCard account={account} />
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </section>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-quaternary">
                Recent Activity
              </h2>
            </div>

            <Card padding="none">
              <div className="divide-y divide-border">
                {recentTransactions.map((tx, index) => {
                  const account = accounts.find((a) => a.id === tx.account_id);
                  const isPositive =
                    tx.type === "deposit" || tx.type === "payment";

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 flex items-center justify-between hover:bg-border/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${account?.color}20` }}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: account?.color }}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-quaternary">
                            {tx.description || tx.category}
                          </p>
                          <p className="text-sm text-quaternary/60">
                            {account?.name} ·{" "}
                            {new Date(tx.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold ${
                          isPositive ? "text-success" : "text-danger"
                        }`}
                      >
                        {isPositive ? "+" : "-"}
                        {formatCurrency(tx.amount, account?.currency)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </section>
        )}
      </main>

      {/* Floating Action Button (Mobile) - Opens Transaction Modal */}
      {accounts.length > 0 && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateTransactionModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-tertiary rounded-full shadow-lg shadow-primary/30 flex items-center justify-center md:hidden"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={showCreateAccountModal}
        onClose={() => setShowCreateAccountModal(false)}
        onCreated={handleAccountCreated}
      />

      {/* Create Transaction Modal */}
      <CreateTransactionModal
        isOpen={showCreateTransactionModal}
        onClose={() => setShowCreateTransactionModal(false)}
        accounts={accounts}
        onCreated={handleTransactionCreated}
      />
    </div>
  );
}
