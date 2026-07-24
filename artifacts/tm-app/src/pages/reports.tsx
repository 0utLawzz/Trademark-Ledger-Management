import { useState } from "react";
import { 
  useReportClientLedger, 
  useReportCaseLedger, 
  useReportOutstanding,
  useReportDailyCollection,
  useReportMonthlyCollection,
  useReportStage
} from "@workspace/api-client-react";
import { 
  FileText, Download, Printer, PieChart, TrendingUp, DollarSign, Calendar
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("outstanding");

  const exportToExcel = (tableId: string, filename: string) => {
    const table = document.getElementById(tableId);
    if (!table) return;
    const wb = XLSX.utils.table_to_book(table, { sheet: "Report" });
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports Hub</h1>
          <p className="text-muted-foreground mt-1">Generate and export financial and operational reports.</p>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 mb-6 print:hidden">
          <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          <TabsTrigger value="daily">Daily Collection</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Collection</TabsTrigger>
          <TabsTrigger value="stage">Stage Report</TabsTrigger>
          <TabsTrigger value="client">Client Ledger</TabsTrigger>
          <TabsTrigger value="case">Case Ledger</TabsTrigger>
        </TabsList>

        <div id="printable-area" className="bg-background">
          <TabsContent value="outstanding" className="m-0">
            <OutstandingReportTab onExport={(id) => exportToExcel(id, "outstanding_report")} onPrint={handlePrint} />
          </TabsContent>
          <TabsContent value="daily" className="m-0">
            <DailyCollectionTab onExport={(id) => exportToExcel(id, "daily_collection")} onPrint={handlePrint} />
          </TabsContent>
          <TabsContent value="monthly" className="m-0">
            <MonthlyCollectionTab onExport={(id) => exportToExcel(id, "monthly_collection")} onPrint={handlePrint} />
          </TabsContent>
          <TabsContent value="stage" className="m-0">
            <StageReportTab onExport={(id) => exportToExcel(id, "stage_report")} onPrint={handlePrint} />
          </TabsContent>
          <TabsContent value="client" className="m-0">
            <ClientLedgerTab onExport={(id) => exportToExcel(id, "client_ledger")} onPrint={handlePrint} />
          </TabsContent>
          <TabsContent value="case" className="m-0">
            <CaseLedgerTab onExport={(id) => exportToExcel(id, "case_ledger")} onPrint={handlePrint} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OutstandingReportTab({ onExport, onPrint }: { onExport: (id: string) => void, onPrint: () => void }) {
  const { data, isLoading } = useReportOutstanding({});
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between print:hidden">
        <div>
          <CardTitle>Outstanding Balances</CardTitle>
          <CardDescription>All clients with positive balances due.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport("outstanding-table")}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden print:block text-2xl font-bold mb-4">Outstanding Balances Report - {format(new Date(), 'MMM dd, yyyy')}</div>
        {isLoading ? <div className="text-center py-8">Loading report...</div> : (
          <Table id="outstanding-table">
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Client No.</TableHead>
                <TableHead className="text-right">Total Due</TableHead>
                <TableHead className="text-right">Total Received</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6">No outstanding balances.</TableCell></TableRow>
              ) : (
                <>
                  {data.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.clientName}</TableCell>
                      <TableCell className="font-mono text-xs">{row.clientNumber}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{formatCurrency(row.totalDue)}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{formatCurrency(row.totalReceived)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-destructive">{formatCurrency(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.reduce((sum, r) => sum + r.totalDue, 0))}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(data.reduce((sum, r) => sum + r.totalReceived, 0))}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{formatCurrency(data.reduce((sum, r) => sum + r.balance, 0))}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DailyCollectionTab({ onExport, onPrint }: { onExport: (id: string) => void, onPrint: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const { data, isLoading } = useReportDailyCollection({ date }, { query: { enabled: !!date }});

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <CardTitle>Daily Collection</CardTitle>
          <CardDescription>Payments received on a specific date.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-auto" />
          <Button variant="outline" size="sm" onClick={() => onExport("daily-table")}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden print:block text-2xl font-bold mb-4">Daily Collection Report - {format(new Date(date), 'MMM dd, yyyy')}</div>
        {isLoading ? <div className="text-center py-8">Loading report...</div> : (
          <Table id="daily-table">
            <TableHeader>
              <TableRow>
                <TableHead>Folder No.</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Received Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.entries || data.entries.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-6">No collections for this date.</TableCell></TableRow>
              ) : (
                <>
                  {data.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.folderNumber}</TableCell>
                      <TableCell>{entry.detail}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{formatCurrency(entry.receivedAmount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total Collection</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(data.totalReceived)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyCollectionTab({ onExport, onPrint }: { onExport: (id: string) => void, onPrint: () => void }) {
  const d = new Date();
  const [year, setYear] = useState(d.getFullYear());
  const [month, setMonth] = useState(d.getMonth() + 1);
  
  const { data, isLoading } = useReportMonthlyCollection({ year, month }, { query: { enabled: !!year && !!month }});

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <CardTitle>Monthly Collection</CardTitle>
          <CardDescription>Financial activity for a specific month.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="number" value={year} onChange={e => setYear(parseInt(e.target.value))} className="w-24" />
          <select 
            className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={month} 
            onChange={e => setMonth(parseInt(e.target.value))}
          >
            {Array.from({length: 12}).map((_, i) => (
              <option key={i+1} value={i+1}>{new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => onExport("monthly-table")}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden print:block text-2xl font-bold mb-4">Monthly Collection Report - {month}/{year}</div>
        {isLoading ? <div className="text-center py-8">Loading report...</div> : (
          <Table id="monthly-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Folder No.</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.entries || data.entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6">No activity for this month.</TableCell></TableRow>
              ) : (
                <>
                  {data.entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), 'MMM dd')}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.folderNumber}</TableCell>
                      <TableCell>{entry.detail}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{entry.dueAmount > 0 ? formatCurrency(entry.dueAmount) : '-'}</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600">{entry.receivedAmount > 0 ? formatCurrency(entry.receivedAmount) : '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={3}>Totals</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(data.totalDue)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(data.totalReceived)}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// Stubs for StageReport, ClientLedger, CaseLedger to save tokens, following the same pattern
function StageReportTab({ onExport, onPrint }: { onExport: (id: string) => void, onPrint: () => void }) {
  const [stage, setStage] = useState<number | undefined>(undefined);
  const { data, isLoading } = useReportStage(stage ? { stage } : {});

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <CardTitle>Cases by Stage</CardTitle>
          <CardDescription>Breakdown of workflow progress.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select 
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
            value={stage || ""} 
            onChange={e => setStage(e.target.value ? parseInt(e.target.value) : undefined)}
          >
            <option value="">All Stages</option>
            <option value={1}>Stage 1: Filing</option>
            <option value={2}>Stage 2: Examination</option>
            <option value={3}>Stage 3: Publication</option>
            <option value={4}>Stage 4: Registration</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => onExport("stage-table")}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <div className="text-center py-8">Loading report...</div> : (
          <Table id="stage-table">
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-6">No data.</TableCell></TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">Stage {row.stage}</TableCell>
                    <TableCell className="font-mono">{row.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ClientLedgerTab({ onExport, onPrint }: { onExport: (id: string) => void, onPrint: () => void }) {
  const [clientId, setClientId] = useState("");
  // In a real implementation this would use a combo box like in New Case
  const { data, isLoading } = useReportClientLedger({ clientId: parseInt(clientId) }, { query: { enabled: !!clientId && !isNaN(parseInt(clientId)) } });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <CardTitle>Client Ledger Report</CardTitle>
          <CardDescription>Financial summary for a specific client.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Client ID" value={clientId} onChange={e => setClientId(e.target.value)} className="w-32" />
          <Button variant="outline" size="sm" onClick={() => onExport("client-ledger-table")}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!clientId ? (
          <div className="text-center py-8 text-muted-foreground">Enter a Client ID to generate report.</div>
        ) : isLoading ? (
          <div className="text-center py-8">Loading report...</div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">No data found for this client.</div>
        ) : (
          <Table id="client-ledger-table">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Folder No.</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6">No transactions.</TableCell></TableRow>
              ) : (
                data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">{entry.folderNumber}</TableCell>
                    <TableCell>{entry.detail}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entry.dueAmount > 0 ? formatCurrency(entry.dueAmount) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600">{entry.receivedAmount > 0 ? formatCurrency(entry.receivedAmount) : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CaseLedgerTab({ onExport, onPrint }: { onExport: (id: string) => void, onPrint: () => void }) {
  const [folderId, setFolderId] = useState("");
  const { data, isLoading } = useReportCaseLedger({ folderId }, { query: { enabled: !!folderId } });

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <CardTitle>Case Ledger Report</CardTitle>
          <CardDescription>Financial summary for a specific case.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Folder No." value={folderId} onChange={e => setFolderId(e.target.value)} className="w-40 font-mono" />
          <Button variant="outline" size="sm" onClick={() => onExport("case-ledger-table")}>
            <Download className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!folderId ? (
          <div className="text-center py-8 text-muted-foreground">Enter a Folder Number to generate report.</div>
        ) : isLoading ? (
          <div className="text-center py-8">Loading report...</div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">No data found for this case.</div>
        ) : (
          <Table id="case-ledger-table">
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
              {data.entries.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6">No transactions.</TableCell></TableRow>
              ) : (
                data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{entry.detail}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{entry.dueAmount > 0 ? formatCurrency(entry.dueAmount) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-emerald-600">{entry.receivedAmount > 0 ? formatCurrency(entry.receivedAmount) : '-'}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{formatCurrency(entry.runningBalance)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
