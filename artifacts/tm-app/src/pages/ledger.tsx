import { useState } from "react";
import { Link } from "wouter";
import { useReportMonthlyCollection, useCreateLedgerEntry } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Plus, BookOpen, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function LedgerPage() {
  const d = new Date();
  const [year, setYear] = useState(d.getFullYear());
  const [month, setMonth] = useState(d.getMonth() + 1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    folderNumber: "",
    detail: "",
    dueAmount: 0,
    receivedAmount: 0
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createEntry = useCreateLedgerEntry();

  const { data, isLoading } = useReportMonthlyCollection(
    { year, month }, 
    { query: { enabled: !!year && !!month } }
  );

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const handleSubmit = () => {
    // In a real app we would validate the folderNumber exists
    // The createLedgerEntry expects tmNumber or caseId implicitly but the schema takes date, tmNumber, stage, detail, amounts
    // Wait, the API requires a folderId in the path if it's case specific, but let's see api schemas:
    // LedgerEntryInput: date, tmNumber?, stage?, detail, dueAmount, receivedAmount.
    // Wait, useCreateLedgerEntry doesn't take folderId? Oh, it's global? No, let's check `api.ts`.
    // Actually, `useCreateLedgerEntry` doesn't exist as a global endpoint in typical REST unless it's POST /api/ledger.
    // The prompt says `/ledger` overview list entries, add entry. Let's look at schema.
    // POST /api/ledger ? The API hooks list: `useCreateLedgerEntry` 
    // `createLedgerEntry.mutate({ data: {...} })` 
    // Wait, we don't have `folderNumber` in `LedgerEntryInput`. 
    // Ah, `LedgerEntryInput` doesn't have folderId. Wait, let me check the API schemas.
    // `LedgerEntryInput: { date, tmNumber, stage, detail, dueAmount, receivedAmount }`
    // Oh, `tmNumber` is there. But we probably need to create it from Case Detail. 
    // Let's check `api.ts` for `createLedgerEntry`. 
    // `getCreateLedgerEntryUrl = (folderId: string)` -> Ah, it requires `folderId`!
    
    // I can't easily do it here without folderId. But wait, `useCreateLedgerEntry` signature:
    // `{folderId: string; data: LedgerEntryInput}`. 
    // I can ask user for Folder No and use it!
    
    if (!form.folderNumber) {
      toast({ title: "Error", description: "Folder Number is required", variant: "destructive" });
      return;
    }

    createEntry.mutate(
      { 
        folderId: form.folderNumber,
        data: {
          date: form.date,
          detail: form.detail,
          dueAmount: Number(form.dueAmount),
          receivedAmount: Number(form.receivedAmount)
        }
      },
      {
        onSuccess: () => {
          toast({ title: "Ledger entry added successfully" });
          setIsAddOpen(false);
          setForm({
            date: new Date().toISOString().split('T')[0],
            folderNumber: "",
            detail: "",
            dueAmount: 0,
            receivedAmount: 0
          });
          // Invalidate monthly collection to refresh
          queryClient.invalidateQueries();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.response?.data?.error || "Failed to create entry", variant: "destructive" });
        }
      }
    );
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Ledger</h1>
          <p className="text-muted-foreground mt-1">Firm-wide financial tracking and recent activity.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Ledger Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Folder Number <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. TM-2024-001" className="font-mono" value={form.folderNumber} onChange={e => setForm({...form, folderNumber: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Input placeholder="Service fee, Filing fee..." value={form.detail} onChange={e => setForm({...form, detail: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Due</label>
                  <Input type="number" min="0" step="0.01" value={form.dueAmount} onChange={e => setForm({...form, dueAmount: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Received</label>
                  <Input type="number" min="0" step="0.01" value={form.receivedAmount} onChange={e => setForm({...form, receivedAmount: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={createEntry.isPending || !form.folderNumber || !form.detail}>
                {createEntry.isPending ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Monthly Activity</CardTitle>
          </div>
          <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold w-32 text-center">{monthName}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} disabled={month === d.getMonth() + 1 && year === d.getFullYear()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-muted/30 border p-4 rounded-xl">
              <div className="text-sm text-muted-foreground font-medium mb-2">Monthly Billed</div>
              <div className="text-3xl font-bold font-mono">{data ? formatCurrency(data.totalDue) : '-'}</div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
              <div className="text-sm text-emerald-700 font-medium mb-2">Monthly Collected</div>
              <div className="text-3xl font-bold font-mono text-emerald-700">{data ? formatCurrency(data.totalReceived) : '-'}</div>
            </div>
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex flex-col justify-center items-center text-center">
              <Link href="/reports">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" /> View Full Reports
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Folder No.</TableHead>
                  <TableHead>Detail</TableHead>
                  <TableHead className="text-right">Billed</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center">Loading transactions...</TableCell></TableRow>
                ) : !data?.entries || data.entries.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No transactions recorded for {monthName}.</TableCell></TableRow>
                ) : (
                  data.entries.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Link href={`/cases/${entry.folderNumber}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                          {entry.folderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{entry.detail}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.dueAmount > 0 ? formatCurrency(entry.dueAmount) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{entry.receivedAmount > 0 ? formatCurrency(entry.receivedAmount) : '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
