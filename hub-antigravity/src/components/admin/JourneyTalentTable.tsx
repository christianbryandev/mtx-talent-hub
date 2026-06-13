import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

type TrackingStatus = "Em dia" | "Travado" | "Concluído";

interface TrackingRow {
  user_id: string;
  name: string;
  email: string;
  total_xp: number;
  current_phase: string;
  progress_percentage: number;
  status: TrackingStatus;
}

async function fetchTracking(): Promise<TrackingRow[]> {
  // RPC criado no backend (SSOT). Autorização: admin/super_admin (checado no Postgres).
  const { data, error } = await supabase.rpc(
    "admin_get_journey_tracking" as never,
  );
  if (error) throw new Error(error.message);
  return (data ?? []) as TrackingRow[];
}

const STATUS_VARIANT: Record<TrackingStatus, "default" | "secondary" | "destructive"> = {
  Concluído: "default",
  "Em dia": "secondary",
  Travado: "destructive",
};

export function JourneyTalentTable() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-journey-tracking"],
    queryFn: fetchTracking,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error instanceof Error ? error.message : "Falha ao carregar tracking."}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhum jovem iniciou a jornada ainda.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Fase atual</TableHead>
              <TableHead className="w-[180px]">Progresso</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.user_id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {row.email}
                </TableCell>
                <TableCell className="text-sm">{row.current_phase}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={row.progress_percentage} className="h-1.5" />
                    <span className="text-xs text-muted-foreground w-10 text-right">
                      {row.progress_percentage}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {row.total_xp}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
