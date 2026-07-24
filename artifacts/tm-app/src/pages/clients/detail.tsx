import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { 
  useGetClient, 
  useGetClientCases, 
  useGetClientLedger,
  useUpdateClient
} from "@workspace/api-client-react";
import { 
  Building2, Phone, Mail, MapPin, Edit, ArrowLeft, Briefcase, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function ClientDetail() {
  const { id } = useParams();
  const clientId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: client, isLoading: loadingClient } = useGetClient(clientId, {
    query: { enabled: !!clientId }
  });
  const { data: cases, isLoading: loadingCases } = useGetClientCases(clientId, {
    query: { enabled: !!clientId }
  });
  const { data: ledger, isLoading: loadingLedger } = useGetClientLedger(clientId, {
    query: { enabled: !!clientId }
  });

  if (loadingClient) {
    return <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/4 bg-muted rounded"></div>
      <div className="h-48 bg-muted rounded-xl"></div>
    </div>;
  }

  if (!client) {
    return <div className="text-center py-12">Client not found</div>;
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">{client.clientNumber}</Badge>
            <span>Client since {format(new Date(client.createdAt), 'MMM yyyy')}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <span className="font-medium block">Client Name</span>
                  <span className="text-muted-foreground">{client.name}</span>
                </div>
              </div>
              
              {client.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium block">Email</span>
                    <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a>
                  </div>
                </div>
              )}
              
              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium block">Phone</span>
                    <span className="text-muted-foreground">{client.phone}</span>
                  </div>
                </div>
              )}
              
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="font-medium block">Address</span>
                    <span className="text-muted-foreground whitespace-pre-wrap">{client.address}</span>
                  </div>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-4 mt-4 border-t">
                <span className="font-medium text-sm block mb-1">Notes</span>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md italic">"{client.notes}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-none border-none bg-transparent">
          <Tabs defaultValue="cases" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-sm mb-4">
              <TabsTrigger value="cases"><Briefcase className="w-4 h-4 mr-2" /> Cases</TabsTrigger>
              <TabsTrigger value="ledger"><FileText className="w-4 h-4 mr-2" /> Consolidated Ledger</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cases" className="m-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Trademark Cases</CardTitle>
                    <CardDescription>All cases associated with this client.</CardDescription>
                  </div>
                  <Link href={`/cases/new?clientId=${client.id}`}>
                    <Button size="sm">New Case</Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folder No.</TableHead>
                        <TableHead>TM Number</TableHead>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCases ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4">Loading cases...</TableCell></TableRow>
                      ) : !cases || cases.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No cases found for this client.</TableCell></TableRow>
                      ) : (
                        cases.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono text-xs font-semibold">
                              <Link href={`/cases/${c.folderNumber}`} className="text-primary hover:underline">{c.folderNumber}</Link>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{c.tmNumber || '-'}</TableCell>
                            <TableCell>{c.applicantName}</TableCell>
                            <TableCell>{c.class || '-'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px]">STAGE {c.stage}</Badge></TableCell>
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
                <CardHeader>
                  <CardTitle>Consolidated Ledger</CardTitle>
                  <CardDescription>Financial overview across all cases.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingLedger ? (
                    <div className="py-8 text-center text-muted-foreground">Loading ledger...</div>
                  ) : !ledger ? (
                    <div className="py-8 text-center text-muted-foreground">No ledger data available.</div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-muted p-4 rounded-lg text-center">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Due</div>
                          <div className="text-xl font-bold font-mono">{formatCurrency(ledger.totalDue)}</div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg text-center">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Received</div>
                          <div className="text-xl font-bold font-mono text-emerald-600">{formatCurrency(ledger.totalReceived)}</div>
                        </div>
                        <div className="bg-primary/10 p-4 rounded-lg text-center border border-primary/20">
                          <div className="text-sm font-medium text-primary mb-1">Balance</div>
                          <div className="text-xl font-bold font-mono text-primary">{formatCurrency(ledger.balance)}</div>
                        </div>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Folder No.</TableHead>
                            <TableHead>Detail</TableHead>
                            <TableHead className="text-right">Due</TableHead>
                            <TableHead className="text-right">Received</TableHead>
                            <TableHead className="text-right">Running Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledger.entries.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-6">No ledger entries found.</TableCell></TableRow>
                          ) : (
                            ledger.entries.map((entry) => (
                              <TableRow key={entry.id}>
                                <TableCell className="whitespace-nowrap">{format(new Date(entry.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell className="font-mono text-xs">
                                  <Link href={`/cases/${entry.folderNumber}`} className="text-primary hover:underline">{entry.folderNumber}</Link>
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={entry.detail}>{entry.detail}</TableCell>
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
        </Card>
      </div>
    </div>
  );
}
