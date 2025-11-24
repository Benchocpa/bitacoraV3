import { Badge } from "./ui/badge";

interface Stat {
  label: string;
  value: string;
  hint?: string;
  variant?: "default" | "secondary" | "success" | "warning" | "destructive";
}

export function StatsCards({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{stat.label}</p>
            {stat.hint && (
              <Badge variant={stat.variant ?? "secondary"}>{stat.hint}</Badge>
            )}
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
