import { useState } from "react";
import { useListAuditLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ShieldAlert, Database, Search } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListAuditLogsOperation } from "@workspace/api-client-react";

export default function AuditLogPage() {
  const [filters, setFilters] = useState({
    tableName: "all",
    operation: "all",
    recordId: "",
  });
  
  const [debouncedRecordId, setDebouncedRecordId] = useState("");

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (key === 'recordId') {
      setTimeout(() => setDebouncedRecordId(value), 300);
    }
  };

  const queryParams = {
    ...(filters.tableName !== 'all' && { tableName: filters.tableName }),
    ...(filters.operation !== 'all' && { operation: filters.operation as ListAuditLogsOperation }),
    ...(debouncedRecordId && { recordId: debouncedRecordId }),
    limit: 100,
  };

  const { data, isLoading } = useListAuditLogs(queryParams);

  const formatChanges = (changesStr?: string | null) => {
    if (!changesStr) return "-";
    try {
      const obj = JSON.parse(changesStr);
      // For short display, just show keys that changed
      const keys = Object.keys(obj);
      if (keys.length === 0) return "No visible changes";
      if (keys.length > 3) return `Changed: ${keys.slice(0, 3).join(', ')} +${keys.length - 3} more`;
      return `Changed: ${keys.join(', ')}`;
    } catch {
      return "Invalid JSON";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground mt-1">System-wide immutable ledger of all data modifications.</p>
        </div>
      </div>

      <Card className="border-none shadow-md bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Entity</label>
              <Select value={filters.tableName} onValueChange={(val) => handleFilterChange("tableName", val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="trademark_cases">Cases</SelectItem>
                  <SelectItem value="ledger_entries">Ledger Entries</SelectItem>
                  <SelectItem value="assignments">Assignments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Operation</label>
              <Select value={filters.operation} onValueChange={(val) => handleFilterChange("operation", val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Operations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-[2]">
              <label className="text-xs font-medium text-muted-foreground">Record ID</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by specific record ID..."
                  className="pl-9 bg-background font-mono"
                  value={filters.recordId}
                  onChange={(e) => handleFilterChange("recordId", e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Security Audit Trail</CardTitle>
          </div>
          {data?.total !== undefined && (
            <Badge variant="secondary" className="font-mono">{data.total} records</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted w-1/3 mx-auto rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data?.data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No audit records match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/10">
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.performedBy || 'System'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        {log.tableName}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          log.operation === 'CREATE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                          log.operation === 'UPDATE' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                          'bg-destructive/10 text-destructive border-destructive/20'
                        }
                      >
                        {log.operation}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      {log.recordId}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-[300px] truncate" title={log.changes || ''}>
                      {formatChanges(log.changes)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
