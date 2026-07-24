import { useState } from "react";
import { Link } from "wouter";
import { useListCases } from "@workspace/api-client-react";
import { Search, Plus, Filter, FileText, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

export default function CasesPage() {
  const [filters, setFilters] = useState({
    folderNumber: "",
    tmNumber: "",
    applicantName: "",
    stage: "all",
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // Debounce text inputs
    if (key !== 'stage') {
      setTimeout(() => setDebouncedFilters(newFilters), 300);
    } else {
      setDebouncedFilters(newFilters);
    }
  };

  const queryParams = {
    ...(debouncedFilters.folderNumber && { folderNumber: debouncedFilters.folderNumber }),
    ...(debouncedFilters.tmNumber && { tmNumber: debouncedFilters.tmNumber }),
    ...(debouncedFilters.applicantName && { applicantName: debouncedFilters.applicantName }),
    ...(debouncedFilters.stage !== 'all' && { stage: parseInt(debouncedFilters.stage) }),
    limit: 50,
  };

  const { data, isLoading } = useListCases(queryParams);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trademark Cases</h1>
          <p className="text-muted-foreground mt-1">Manage and track all trademark applications.</p>
        </div>
        <Link href="/cases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Case
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-md bg-card/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">Folder No.</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search folder..."
                  className="pl-9 bg-background"
                  value={filters.folderNumber}
                  onChange={(e) => handleFilterChange("folderNumber", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-xs font-medium text-muted-foreground">TM No.</label>
              <Input
                placeholder="Search TM number..."
                className="bg-background"
                value={filters.tmNumber}
                onChange={(e) => handleFilterChange("tmNumber", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-1 lg:flex-[2]">
              <label className="text-xs font-medium text-muted-foreground">Applicant Name</label>
              <Input
                placeholder="Search applicant..."
                className="bg-background"
                value={filters.applicantName}
                onChange={(e) => handleFilterChange("applicantName", e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">Stage Filter</label>
              <Select value={filters.stage} onValueChange={(val) => handleFilterChange("stage", val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="1">Stage 1: Filing</SelectItem>
                  <SelectItem value="2">Stage 2: Examination</SelectItem>
                  <SelectItem value="3">Stage 3: Publication</SelectItem>
                  <SelectItem value="4">Stage 4: Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[120px]">Folder No.</TableHead>
                <TableHead>Applicant & Client</TableHead>
                <TableHead>TM Number</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Filing Date</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted w-1/3 mx-auto rounded"></div>
                      <div className="h-4 bg-muted w-1/4 mx-auto rounded"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !data?.data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No cases match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.data.map((caseItem) => (
                  <TableRow key={caseItem.id} className="hover:bg-muted/30 group">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {caseItem.folderNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{caseItem.applicantName}</div>
                      <div className="text-xs text-muted-foreground">{caseItem.clientName || caseItem.clientNumber}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{caseItem.tmNumber || '-'}</TableCell>
                    <TableCell>{caseItem.class || '-'}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {caseItem.filingDate ? format(new Date(caseItem.filingDate), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary hover:bg-primary/20">
                        STAGE {caseItem.stage}
                      </Badge>
                      {caseItem.subStage && <div className="text-[10px] text-muted-foreground mt-1 truncate max-w-[120px]">{caseItem.subStage}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/cases/${caseItem.folderNumber}`}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {data?.total !== undefined && (
            <div className="p-4 border-t text-xs text-muted-foreground flex justify-between items-center">
              <span>Showing {data.data.length} of {data.total} cases</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
