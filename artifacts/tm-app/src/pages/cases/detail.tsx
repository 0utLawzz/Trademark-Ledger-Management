import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetCase, 
  useUpdateCase,
  useUpdateCaseStage,
  useGetCaseLedger,
  useCreateLedgerEntry,
  useCreateAssignment,
  useUpdateAssignment,
  getGetCaseQueryKey,
  getGetCaseLedgerQueryKey
} from "@workspace/api-client-react";
import { 
  ArrowLeft, FileText, CheckCircle2, Circle, Clock, DollarSign,
  Plus, Edit, Save, X, UserCircle
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function CaseDetail() {
  const { folderId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tmCase, isLoading } = useGetCase(folderId || "", {
    query: { enabled: !!folderId }
  });

  const { data: ledger, isLoading: loadingLedger } = useGetCaseLedger(folderId || "", {
    query: { enabled: !!folderId }
  });

  const updateCase = useUpdateCase();
  const createLedgerEntry = useCreateLedgerEntry();
  const createAssignment = useCreateAssignment();
  
  // Ledger form state
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [ledgerForm, setLedgerForm] = useState({ date: new Date().toISOString().split('T')[0], detail: "", dueAmount: 0, receivedAmount: 0 });

  // Assignment form state
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({ personName: "", city: "", assignedDate: new Date().toISOString().split('T')[0], status: "Pending" });

  if (isLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/3 bg-muted rounded"></div>
      <div className="h-64 bg-muted rounded-xl"></div>
    </div>;
  }

  if (!tmCase) {
    return <div className="text-center py-12">Case not found</div>;
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const handleStageAdvance = () => {
    if (tmCase.stage >= 4) return;
    updateCase.mutate(
      { folderId: tmCase.folderNumber, data: { stage: tmCase.stage + 1 } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(tmCase.folderNumber) });
          toast({ title: `Advanced to Stage ${tmCase.stage + 1}` });
        }
      }
    );
  };

  const handleCreateLedger = () => {
    createLedgerEntry.mutate(
      {
        data: {
          date: ledgerForm.date,
          tmNumber: tmCase.tmNumber || undefined,
          stage: tmCase.stage,
          detail: ledgerForm.detail,
          dueAmount: Number(ledgerForm.dueAmount),
          receivedAmount: Number(ledgerForm.receivedAmount)
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCaseLedgerQueryKey(tmCase.folderNumber) });
          toast({ title: "Ledger entry added." });
          setIsLedgerOpen(false);
          setLedgerForm({ date: new Date().toISOString().split('T')[0], detail: "", dueAmount: 0, receivedAmount: 0 });
        }
      }
    );
  };

  const handleCreateAssignment = () => {
    createAssignment.mutate(
      {
        folderId: tmCase.folderNumber,
        data: assignmentForm
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(tmCase.folderNumber) });
          toast({ title: "Assignment added." });
          setIsAssignmentOpen(false);
          setAssignmentForm({ personName: "", city: "", assignedDate: new Date().toISOString().split('T')[0], status: "Pending" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation('/cases')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight font-mono text-primary">{tmCase.folderNumber}</h1>
              <Badge className="font-mono bg-primary/20 text-primary hover:bg-primary/30 border-none">STAGE {tmCase.stage}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">Applicant: <span className="font-medium text-foreground">{tmCase.applicantName}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={tmCase.stage >= 4} onClick={handleStageAdvance}>
            Advance Stage
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-1 shadow-sm">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-base">File Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Client</div>
              <div className="font-medium">
                <Link href={`/clients/${tmCase.clientId}`} className="text-primary hover:underline">
                  {tmCase.clientName || tmCase.clientNumber}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">TM Number</div>
              <div className="font-mono text-sm">{tmCase.tmNumber || 'Not assigned'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Class(es)</div>
              <div className="text-sm">{tmCase.class || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider">Filing Date</div>
              <div className="text-sm">{tmCase.filingDate ? format(new Date(tmCase.filingDate), 'MMMM dd, yyyy') : 'N/A'}</div>
            </div>
            
            {tmCase.notes && (
              <div className="pt-4 mt-4 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Internal Notes</div>
                <p className="text-sm italic bg-muted/30 p-2 rounded">{tmCase.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-3">
          <Tabs defaultValue="stages" className="w-full">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl mb-4">
              <TabsTrigger value="stages">Workflow Stages</TabsTrigger>
              <TabsTrigger value="assignments">Stage 2 Assignments</TabsTrigger>
              <TabsTrigger value="ledger">Case Ledger</TabsTrigger>
            </TabsList>
            
            <TabsContent value="stages" className="m-0 space-y-4">
              {[1, 2, 3, 4].map((stageNum) => {
                const stageData = tmCase.stages?.find(s => s.stageNumber === stageNum);
                const isActive = tmCase.stage === stageNum;
                const isPast = tmCase.stage > stageNum;
                
                return (
                  <Card key={stageNum} className={isActive ? 'border-primary shadow-sm' : isPast ? 'bg-muted/10' : 'opacity-60'}>
                    <CardHeader className="py-3 flex flex-row items-center gap-4">
                      {isPast ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : isActive ? <Circle className="h-6 w-6 text-primary fill-primary/20" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
                      <div className="flex-1">
                        <CardTitle className="text-base">Stage {stageNum}: {stageNum === 1 ? 'Filing' : stageNum === 2 ? 'Examination' : stageNum === 3 ? 'Publication' : 'Registration'}</CardTitle>
                      </div>
                      {stageData && stageData.status && (
                        <Badge variant="outline">{stageData.status}</Badge>
                      )}
                    </CardHeader>
                    {(isActive || isPast) && stageData && (
                      <CardContent className="pt-0 pb-4 pl-14">
                        {stageData.subStatus && (
                          <div className="text-sm mb-3">
                            <span className="font-medium">Sub-status:</span> <span className="text-muted-foreground">{stageData.subStatus}</span>
                          </div>
                        )}
                        {stageData.timeline && stageData.timeline.length > 0 && (
                          <div className="space-y-2 mt-4">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeline</div>
                            {stageData.timeline.map((event, idx) => (
                              <div key={idx} className="flex text-sm border-l-2 border-muted pl-3 py-1">
                                <span className="w-24 text-muted-foreground shrink-0">{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                                <span>{event.description}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="assignments" className="m-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Assignments</CardTitle>
                    <CardDescription>Personnel assigned during Stage 2 (Examination).</CardDescription>
                  </div>
                  <Dialog open={isAssignmentOpen} onOpenChange={setIsAssignmentOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-1"/> Assign Person</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Assignment</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Person Name</label>
                          <Input value={assignmentForm.personName} onChange={e => setAssignmentForm({...assignmentForm, personName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">City</label>
                          <Input value={assignmentForm.city} onChange={e => setAssignmentForm({...assignmentForm, city: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Assigned Date</label>
                          <Input type="date" value={assignmentForm.assignedDate} onChange={e => setAssignmentForm({...assignmentForm, assignedDate: e.target.value})} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateAssignment} disabled={createAssignment.isPending || !assignmentForm.personName}>Save Assignment</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Person</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Assigned</TableHead>
                        <TableHead>Accepted</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!tmCase.assignments || tmCase.assignments.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No assignments.</TableCell></TableRow>
                      ) : (
                        tmCase.assignments.map(a => (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium flex items-center gap-2"><UserCircle className="h-4 w-4 text-muted-foreground"/> {a.personName}</TableCell>
                            <TableCell>{a.city || '-'}</TableCell>
                            <TableCell>{format(new Date(a.assignedDate), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>{a.acceptedDate ? format(new Date(a.acceptedDate), 'MMM dd, yyyy') : '-'}</TableCell>
                            <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ledger" className="m-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Case Ledger</CardTitle>
                    <CardDescription>Financial records tied to this folder.</CardDescription>
                  </div>
                  <Dialog open={isLedgerOpen} onOpenChange={setIsLedgerOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-1"/> Add Entry</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>New Ledger Entry</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date</label>
                          <Input type="date" value={ledgerForm.date} onChange={e => setLedgerForm({...ledgerForm, date: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Detail</label>
                          <Input placeholder="Invoice #1234, Filing Fee, etc." value={ledgerForm.detail} onChange={e => setLedgerForm({...ledgerForm, detail: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Amount Due</label>
                            <Input type="number" min="0" step="0.01" value={ledgerForm.dueAmount} onChange={e => setLedgerForm({...ledgerForm, dueAmount: parseFloat(e.target.value)})} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Amount Received</label>
                            <Input type="number" min="0" step="0.01" value={ledgerForm.receivedAmount} onChange={e => setLedgerForm({...ledgerForm, receivedAmount: parseFloat(e.target.value)})} />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleCreateLedger} disabled={createLedgerEntry.isPending || !ledgerForm.detail}>Save Entry</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {loadingLedger ? (
                    <div className="text-center py-6">Loading ledger...</div>
                  ) : !ledger ? (
                    <div className="text-center py-6 text-muted-foreground">Ledger unavailable.</div>
                  ) : (
                    <div className="space-y-4">
                       <div className="flex gap-4 p-3 bg-muted/30 rounded-lg border">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">Total Due</div>
                          <div className="font-mono font-medium">{formatCurrency(ledger.totalDue)}</div>
                        </div>
                        <div className="flex-1 border-l pl-4">
                          <div className="text-xs text-muted-foreground">Total Received</div>
                          <div className="font-mono font-medium text-emerald-600">{formatCurrency(ledger.totalReceived)}</div>
                        </div>
                        <div className="flex-1 border-l pl-4">
                          <div className="text-xs text-primary font-medium">Balance</div>
                          <div className="font-mono font-bold text-primary">{formatCurrency(ledger.balance)}</div>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Detail</TableHead>
                            <TableHead className="text-right">Due</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledger.entries.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-6">No transactions.</TableCell></TableRow>
                          ) : (
                            ledger.entries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>{entry.detail}</TableCell>
                                <TableCell className="text-right font-mono text-sm">{entry.dueAmount > 0 ? formatCurrency(entry.dueAmount) : '-'}</TableCell>
                                <TableCell className="text-right font-mono text-sm text-emerald-600">{entry.receivedAmount > 0 ? formatCurrency(entry.receivedAmount) : '-'}</TableCell>
                                <TableCell className="text-right font-mono text-sm font-medium">{formatCurrency(entry.runningBalance)}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
}
