import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Pencil } from "lucide-react";

interface Props {
  onEdit: () => void;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  isBusy?: boolean;
}

export function PlanningApprovalActions({ onEdit, onApprove, onReject, isBusy }: Props) {
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <>
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={onEdit} disabled={isBusy}>
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          onClick={() => setConfirmRejectOpen(true)}
          disabled={isBusy}
          className="text-red-600 hover:bg-red-50"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Rejeitar
        </Button>
        <Button
          onClick={() => setConfirmApproveOpen(true)}
          disabled={isBusy}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Aprovar
        </Button>
      </div>

      {/* Confirmacao de aprovacao */}
      <AlertDialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aprovar sugestao de planeamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao aprovar, voce confirma que revisou todo o conteudo da sugestao
              gerada e assume responsabilidade clinica pelo plano resultante.
              Esta acao sera registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await onApprove();
                setConfirmApproveOpen(false);
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Sim, aprovar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmacao de rejeicao */}
      <AlertDialog open={confirmRejectOpen} onOpenChange={setConfirmRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar sugestao?</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeicao (sera registrado no log de auditoria).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="ex: Sugestao desalinhada com achados clinicos complementares"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (rejectReason.trim().length < 5) {
                  return; // bloqueia sem motivo
                }
                await onReject(rejectReason);
                setRejectReason("");
                setConfirmRejectOpen(false);
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={rejectReason.trim().length < 5}
            >
              Rejeitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
