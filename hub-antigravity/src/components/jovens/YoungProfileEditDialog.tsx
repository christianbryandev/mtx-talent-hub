import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type YoungPerson } from "@/types";

interface YoungProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  young: YoungPerson;
}

export function YoungProfileEditDialog({ open, onOpenChange, young }: YoungProfileEditDialogProps) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: young.full_name || "",
    cpf: young.cpf || "",
    birth_date: young.birth_date ? young.birth_date.split("T")[0] : "",
    city: young.city || "",
    vocation_area: young.vocation_area || young.interest_area || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      setLoading(true);
      const { error } = await supabase
        .from("young_people")
        .update({
          full_name: formData.full_name.trim(),
          cpf: formData.cpf.trim() || null,
          birth_date: formData.birth_date || null,
          city: formData.city.trim() || null,
          vocation_area: formData.vocation_area.trim() || null,
        })
        .eq("id", young.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["young_people"] });
      toast.success("Dados do jovem atualizados com sucesso!");
      onOpenChange(false);
    },
    onError: (e) => {
      toast.error("Erro ao atualizar dados: " + e.message);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Dados Pessoais</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input 
              id="full_name" 
              name="full_name" 
              value={formData.full_name} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input 
                id="cpf" 
                name="cpf" 
                value={formData.cpf} 
                onChange={handleChange} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Data de Nasc.</Label>
              <Input 
                id="birth_date" 
                name="birth_date" 
                type="date"
                value={formData.birth_date} 
                onChange={handleChange} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input 
                id="city" 
                name="city" 
                value={formData.city} 
                onChange={handleChange} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vocation_area">Área de Vocação</Label>
              <Input 
                id="vocation_area" 
                name="vocation_area" 
                value={formData.vocation_area} 
                onChange={handleChange} 
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            className="bg-gradient-mtx text-white border-none shadow-mtx-glow"
            onClick={() => updateProfile.mutate()} 
            disabled={loading || !formData.full_name.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
