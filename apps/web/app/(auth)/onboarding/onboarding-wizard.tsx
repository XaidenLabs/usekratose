"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cluster } from "@usekratose/core";

import { ProjectStep } from "./steps/project-step";
import { ProgramStep } from "./steps/program-step";
import { AlertsStep } from "./steps/alerts-step";
import { WelcomeStep } from "./steps/welcome-step";

const STEPS = [
  { id: "project", label: "Create project" },
  { id: "program", label: "Add program" },
  { id: "alerts", label: "Setup alerts" },
  { id: "welcome", label: "Ready" },
] as const;

export function OnboardingWizard({
  defaultCluster,
}: {
  readonly defaultCluster: Cluster;
}) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [programAddress, setProgramAddress] = useState<string | null>(null);

  function nextStep() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }

  function skipToEnd() {
    setCurrentStep(STEPS.length - 1);
  }

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="onboarding-container">
      {/* Progress bar */}
      <div className="onboarding-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="progress-steps">
          {STEPS.map((step, i) => (
            <div
              className={`progress-step ${i <= currentStep ? "active" : ""} ${i === currentStep ? "current" : ""}`}
              key={step.id}
            >
              <span className="step-dot">
                {i < currentStep ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </span>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="onboarding-content">
        {currentStep === 0 && (
          <ProjectStep
            onComplete={(id) => {
              setProjectId(id);
              nextStep();
            }}
          />
        )}
        {currentStep === 1 && (
          <ProgramStep
            defaultCluster={defaultCluster}
            onComplete={(address) => {
              setProgramAddress(address);
              nextStep();
            }}
            onSkip={nextStep}
          />
        )}
        {currentStep === 2 && (
          <AlertsStep onComplete={nextStep} onSkip={skipToEnd} />
        )}
        {currentStep === 3 && (
          <WelcomeStep
            onContinue={goToDashboard}
            programAddress={programAddress}
            projectId={projectId}
          />
        )}
      </div>
    </div>
  );
}
