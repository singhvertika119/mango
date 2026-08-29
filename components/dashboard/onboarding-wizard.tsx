"use client";

import * as React from "react";
import { Sparkles, Layers, ShieldCheck, X, ChevronRight, ChevronLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Layers,
    title: "Dynamic Workspaces",
    description: "Use the top workspace sidebar switcher to swap between multiple developer sandboxes and project environments seamlessly.",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
  },
  {
    icon: Bot,
    title: "AI-Native RAG Agent",
    description: "Upload code specifications, PRDs, or guidelines. The agent automatically chunks, vectorizes, and references them to answer questions with high precision.",
    color: "text-primary bg-primary/10 border-primary/20"
  },
  {
    icon: ShieldCheck,
    title: "Secure Verification Loops",
    description: "Integrate GitHub and trigger project writes. The controller blocks on WRITE tools, prompts you for approval, and runs verification checks.",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  }
];

export function OnboardingWizard() {
  const [open, setOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState(0);

  React.useEffect(() => {
    // Check if user has already onboarded
    const onboarded = localStorage.getItem("mango_onboarded");
    if (!onboarded) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("mango_onboarded", "true");
    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!open) return null;

  const ActiveIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-md bg-card border border-solid border-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Close/Skip Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-0"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-10 flex flex-col items-center text-center space-y-6">
          {/* Animated Icon Ring */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border border-solid ring-8 ring-accent/30 ${steps[currentStep].color}`}>
            <ActiveIcon className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              {steps[currentStep].title}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs font-medium">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Dots Indicator */}
          <div className="flex gap-1.5 justify-center">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? "bg-primary w-3" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          {/* Buttons Navigation */}
          <div className="flex items-center justify-between w-full pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentStep === 0}
              onClick={handleBack}
              className="text-xs font-semibold cursor-pointer h-8 px-3 gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
            <Button
              size="sm"
              onClick={handleNext}
              className="text-xs font-semibold cursor-pointer h-8 px-4 gap-1.5"
            >
              <span>{currentStep === steps.length - 1 ? "Get Started" : "Next"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
