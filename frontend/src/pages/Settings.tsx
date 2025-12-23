import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User as UserIcon, Globe, Save, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { user as userApi } from "../api/client";
import { Button, Card, Input } from "../components/ui";
import { CURRENCIES } from "../types";

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

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPreferredCurrency(user.preferred_currency || "DOP");
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await userApi.updatePreferences({
        name: name || undefined,
        preferred_currency: preferredCurrency,
      });
      await refreshUser();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    name !== (user?.name || "") ||
    preferredCurrency !== (user?.preferred_currency || "DOP");

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
