import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const steps = [
  { key: "open", label: "Open", help: "Job is live and accepting bids." },
  { key: "accepted", label: "Accepted", help: "A bid was accepted and funds were authorized into escrow." },
  { key: "en_route", label: "En route", help: "Remover is on the way." },
  { key: "arrived", label: "Arrived", help: "Remover arrived at the location." },
  { key: "picked_up", label: "Picked up", help: "Remover marked items as picked up. Poster can confirm to release escrow." },
  { key: "completed", label: "Completed", help: "Payment captured and payout processed (or held until Connect is enabled)." },
  { key: "canceled", label: "Canceled", help: "Job was canceled." },
  { key: "disputed", label: "Disputed", help: "Dispute opened. Capture is paused until resolved." },
] as const;

type JobStatus = (typeof steps)[number]["key"];

function stepState(status: JobStatus, step: JobStatus) {
  const order: JobStatus[] = ["open", "accepted", "en_route", "arrived", "picked_up", "completed"];
  if (["canceled", "disputed"].includes(status)) return status === step ? "current" : "upcoming";
  const si = order.indexOf(step);
  const ci = order.indexOf(status);
  if (si === -1) return "upcoming";
  if (ci === -1) return "upcoming";
  if (si < ci) return "done";
  if (si === ci) return "current";
  return "upcoming";
}

export function StatusTimeline({ status }: { status: string }) {
  const s = status as JobStatus;
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {steps
          .filter((x) => {
            if (["canceled", "disputed"].includes(s)) return x.key === s;
            return ["open", "accepted", "en_route", "arrived", "picked_up", "completed"].includes(x.key);
          })
          .map((step) => {
            const state = stepState(s, step.key);
            return (
              <div key={step.key} className="flex items-center gap-2">
                <Badge
                  variant={
                    state === "done"
                      ? "success"
                      : state === "current"
                        ? "warning"
                        : "default"
                  }
                  className={cn(state === "upcoming" ? "opacity-70" : "")}
                >
                  {step.label}
                </Badge>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{step.help}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}

