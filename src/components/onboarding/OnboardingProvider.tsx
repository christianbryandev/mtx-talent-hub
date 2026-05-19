import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/styles/driver-mtx.css";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import mtxLogo from "@/assets/mtx-hub-logo.png";

import { getTourSteps, WELCOME_MESSAGES, type TourStep } from "@/lib/onboarding/tour-steps";
import { ROLE_LABELS } from "@/types";

const REPLAY_EVENT = "mtx:restart-onboarding";

export function startOnboardingTour() {
  window.dispatchEvent(new CustomEvent(REPLAY_EVENT));
}

function waitForElement(selector: string, timeout = 4000): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) return resolve();
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
  });
}

export function OnboardingProvider() {
  const { user } = useAuth();
  const { role, loading: rolesLoading } = usePermissions();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const qc = useQueryClient();
  const driverRef = useRef<Driver | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const seenOpenRef = useRef(false);

  const { data: profile } = useQuery({
    queryKey: ["onboarding-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (rolesLoading || !profile || seenOpenRef.current) return;
    if (profile.onboarding_completed === false) {
      seenOpenRef.current = true;
      const t = setTimeout(() => setWelcomeOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [profile, rolesLoading]);

  const markCompleted = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    qc.invalidateQueries({ queryKey: ["onboarding-profile", user.id] });
  }, [qc, user]);

  const goToStep = useCallback(
    async (steps: TourStep[], idx: number) => {
      const step = steps[idx];
      if (!step) return;
      if (step.route && pathnameRef.current !== step.route) {
        await navigate({ to: step.route });
      }
      if (step.element) {
        await waitForElement(step.element);
      } else {
        await new Promise((r) => setTimeout(r, 150));
      }
    },
    [navigate],
  );

  const runTour = useCallback(async () => {
    const steps = getTourSteps(role);

    const driverSteps = steps.map((s) => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
      },
    }));

    const d = driver({
      showProgress: true,
      allowClose: false,
      overlayClickBehavior: "nextStep" as never,
      disableActiveInteraction: true,
      overlayOpacity: 0.8,
      smoothScroll: true,
      stagePadding: 6,
      stageRadius: 8,
      popoverClass: "mtx-driver-popover",
      nextBtnText: "Próximo →",
      prevBtnText: "← Voltar",
      doneBtnText: "Começar a usar",
      showButtons: ["next", "previous", "close"],
      closeBtnText: "Pular tour",
      progressText: "Passo {{current}} de {{total}}",
      steps: driverSteps,
      onNextClick: async () => {
        const current = d.getActiveIndex() ?? 0;
        const nextIdx = current + 1;
        if (nextIdx >= steps.length) {
          d.destroy();
          return;
        }
        await goToStep(steps, nextIdx);
        d.moveNext();
      },
      onPrevClick: async () => {
        const current = d.getActiveIndex() ?? 0;
        const prevIdx = current - 1;
        if (prevIdx < 0) return;
        await goToStep(steps, prevIdx);
        d.movePrevious();
      },
      onCloseClick: () => {
        d.destroy();
      },
      onDestroyed: () => {
        markCompleted();
        driverRef.current = null;
      },
    });

    driverRef.current = d;
    // Navigate to first step's route before driving
    await goToStep(steps, 0);
    d.drive();
  }, [goToStep, markCompleted, role]);

  useEffect(() => {
    const handler = () => {
      if (driverRef.current) driverRef.current.destroy();
      runTour();
    };
    window.addEventListener(REPLAY_EVENT, handler);
    return () => window.removeEventListener(REPLAY_EVENT, handler);
  }, [runTour]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (driverRef.current) driverRef.current.destroy();
    };
  }, []);

  const handleStart = () => {
    setWelcomeOpen(false);
    setTimeout(runTour, 250);
  };

  const handleSkip = () => {
    setWelcomeOpen(false);
    markCompleted();
  };

  const firstName = (profile?.full_name ?? profile?.email ?? "").split(" ")[0] || "";
  const welcomeMessage = role ? WELCOME_MESSAGES[role] : WELCOME_MESSAGES.colaborador;

  return (
    <Dialog open={welcomeOpen} onOpenChange={(o) => !o && handleSkip()}>
      <DialogContent className="max-w-md overflow-hidden border-t-2 border-t-primary animate-in fade-in zoom-in-95">
        <DialogHeader className="items-center text-center space-y-3">
          <img src={mtxLogo} alt="MTX Hub" className="h-12 w-auto drop-shadow-[0_0_16px_rgba(192,38,211,0.35)]" />
          <DialogTitle className="text-xl">
            Bem-vindo(a) ao MTX Hub
            {firstName ? `, ${firstName}` : ""}! 👋
          </DialogTitle>
          {role && (
            <span className="inline-block rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">
              {ROLE_LABELS[role]}
            </span>
          )}
          <DialogDescription className="text-sm leading-relaxed">
            {welcomeMessage}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button variant="ghost" onClick={handleSkip}>
            Pular e explorar sozinho
          </Button>
          <Button onClick={handleStart}>Iniciar tour</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
