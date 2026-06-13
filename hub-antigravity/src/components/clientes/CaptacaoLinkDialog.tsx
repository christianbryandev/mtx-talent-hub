import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Check, ExternalLink, Download, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaptacaoLinkDialog({ open, onOpenChange }: Props) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/cadastro-cliente`
      : "/cadastro-cliente";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  const download = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "mtx-captacao-cliente-qr.png";
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            Link de Captação de Cliente
          </DialogTitle>
          <DialogDescription>
            Compartilhe este link para que novos clientes possam enviar os dados e cair diretamente no sistema como "Lead".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={url} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copy}>
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex justify-center rounded-lg border border-border bg-white p-4">
            <div ref={qrRef}>
              <QRCodeCanvas value={url} size={200} level="H" includeMargin />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => window.open(url, "_blank")}>
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir aba
            </Button>
            <Button onClick={download}>
              <Download className="mr-2 h-4 w-4" /> Baixar QR Code
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
