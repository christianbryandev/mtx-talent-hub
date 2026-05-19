import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/styles/driver-mtx.css";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useSidebar } from "@/components/ui/sidebar";
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

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 768;
}

function waitForElement(selector: string, timeout = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
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

  // Sidebar control for mobile
  const sidebar = useSidebar();
  const sidebarRef = useRef(sidebar);
  useEffect(() => {
    sidebarRef.current = sidebar;
  }, [sidebar]);

  const qc = useQueryClient();
  const driverRef = useRef<Driver | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
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

  const prepareStep = useCallback(
    async (steps: TourStep[], idx: number) => {
      const step = steps[idx];
      if (!step) return;

      const needsNavigation = step.route && pathnameRef.current !== step.route;
      const isSidebarTarget = step.element?.includes("nav-") || step.element?.includes("sidebar");
      const mobile = isMobileViewport();

      // Show transition overlay only when changing routes
      if (needsNavigation) setTransitioning(true);

      try {
        if (needsNavigation && step.route) {
          await navigate({ to: step.route });
        }

        if (step.element) {
          // On mobile, open sidebar if highlighting a nav item
          if (mobile && isSidebarTarget) {
            sidebarRef.current?.setOpenMobile(true);
            await new Promise((r) => setTimeout(r, 250));
          }

          const el = await waitForElement(step.element);
          // Extra tick to let layout settle
          await new Promise((r) => setTimeout(r, 200));
          // Smooth scroll into view
          if (el) {
            try {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              await new Promise((r) => setTimeout(r, 250));
            } catch {
              /* ignore */
            }
          }
        } else {
          await new Promise((r) => setTimeout(r, 200));
        }
      } finally {
        if (needsNavigation) setTransitioning(false);
      }
    },
    [navigate],
  );

  const runTour = useCallback(async () => {
    const steps = getTourSteps(role);
    const mobile = isMobileViewport();

    const driverSteps = steps.map((s) => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
        showButtons: ["next", "previous", "close"] as ("next" | "previous" | "close")[],
        closeBtnText: "Pular tour",
        side: mobile ? ("bottom" as const) : undefined,
        align: mobile ? ("center" as const) : undefined,
      },
    }));

    const d = driver({
      showProgress: true,
      allowClose: false,
      overlayClickBehavior: "nextStep" as never,
      disableActiveInteraction: true,
      overlayOpacity: 0.8,
      smoothScroll: true,
      stagePadding: 8,
      stageRadius: 8,
      popoverClass: "mtx-driver-popover",
      nextBtnText: "Próximo →",
      prevBtnText: "← Voltar",
      doneBtnText: "🎉 Começar a usar",
      showButtons: ["next", "previous", "close"],
      progressText: "Passo {{current}} de {{total}}",
      steps: driverSteps,
      onNextClick: async () => {
        const current = d.getActiveIndex() ?? 0;
        const nextIdx = current + 1;
        if (nextIdx >= steps.length) {
          d.destroy();
          return;
        }
        await prepareStep(steps, nextIdx);
        d.moveNext();
      },
      onPrevClick: async () => {
        const current = d.getActiveIndex() ?? 0;
        const prevIdx = current - 1;
        if (prevIdx < 0) return;
        await prepareStep(steps, prevIdx);
        d.movePrevious();
      },
      onCloseClick: () => {
        d.destroy();
      },
      onDestroyed: () => {
        // Close mobile sidebar if we opened it
        if (isMobileViewport()) {
          sidebarRef.current?.setOpenMobile(false);
        }
        setTransitioning(false);
        markCompleted();
        driverRef.current = null;
      },
    });

    driverRef.current = d;
    await prepareStep(steps, 0);
    d.drive();
  }, [prepareStep, markCompleted, role]);

  useEffect(() => {
    const handler = () => {
      if (driverRef.current) driverRef.current.destroy();
      runTour();
    };
    window.addEventListener(REPLAY_EVENT, handler);
    return () => window.removeEventListener(REPLAY_EVENT, handler);
  }, [runTour]);

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
    <>
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

      {transitioning && (
        <div className="mtx-tour-transition" role="status" aria-live="polite">
          <div className="mtx-tour-transition__spinner" />
          <div className="mtx-tour-transition__label">Carregando próximo passo...</div>
        </div>
      )}
    </>
  );
}
