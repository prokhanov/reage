import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProgramDiffTable } from "@/components/landing/energy/ProgramDiffTable";

interface ProgramDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProgramDiffDialog({ open, onOpenChange }: ProgramDiffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden flex flex-col max-h-[88dvh] w-[calc(100%-1.5rem)] rounded-2xl p-4 sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-xl sm:text-2xl">Отличие разовых чекапов от годовой программы</DialogTitle>
          <DialogDescription>
            Что меняется, когда разовые сдачи складываются в наблюдение в течение года
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2">
          <ProgramDiffTable />
        </div>
      </DialogContent>
    </Dialog>
  );
}
