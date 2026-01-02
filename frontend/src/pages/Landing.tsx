import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Wallet,
  PieChart,
  Target,
  CreditCard,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Track Accounts",
    description:
      "Manage checking, savings, credit cards, and more in one place",
  },
  {
    icon: PieChart,
    title: "See Reports",
    description: "Visualize where your money goes with detailed breakdowns",
  },
  {
    icon: Target,
    title: "Set Budgets",
    description: "Create spending limits per category and stay on track",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-tertiary overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent rotate-12" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-secondary/10 via-transparent to-transparent -rotate-12" />
        {/* Floating shapes */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full bg-secondary/5 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-16 md:mb-24"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-quaternary">
              Odin Wallet
            </span>
          </div>
          <Link
            to="/login"
            className="text-sm text-quaternary/70 hover:text-quaternary transition-colors"
          >
            Sign in
          </Link>
        </motion.header>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-16 md:mb-24"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            Personal Finance Made Simple
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-quaternary mb-6 leading-tight">
            Take control of
            <br />
            <span className="text-primary">your finances</span>
          </h1>

          <p className="text-lg md:text-xl text-quaternary/60 max-w-2xl mx-auto mb-10">
            Track your spending, manage multiple accounts, and reach your
            financial goals with a beautifully simple app.
          </p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-tertiary font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-8 py-4 text-quaternary font-medium rounded-xl border border-border hover:bg-card transition-all"
            >
              Already have an account?
            </Link>
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="group p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/30 transition-all hover:bg-card"
            >
              <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-quaternary mb-2">
                {feature.title}
              </h3>
              <p className="text-quaternary/60 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center text-quaternary/40 text-sm"
        >
          <p>Built with care for managing your personal finances</p>
        </motion.footer>
      </div>
    </div>
  );
}
