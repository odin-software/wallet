import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { OnboardingCarousel } from "../components/onboarding/OnboardingCarousel";
import { user as userApi } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await userApi.completeOnboarding();
      await refreshUser();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      // Navigate anyway - the backend will still mark it complete on next interaction
      navigate("/", { replace: true });
    }
  };

  const handleSkip = async () => {
    // Skip also completes onboarding
    await handleComplete();
  };

  if (isCompleting) {
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

  return <OnboardingCarousel onComplete={handleComplete} onSkip={handleSkip} />;
}
