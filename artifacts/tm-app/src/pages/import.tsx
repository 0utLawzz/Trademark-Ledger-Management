import { useState, useRef } from "react";
import { Link } from "wouter";
import * as XLSX from "xlsx";
import { useImportCases } from "@workspace/api-client-react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronRight, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const importCases = useImportCases();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(ws);
        
        // Map to expected structure (camelCase properties)
        const mappedData = rawData.map((row: any) => ({
          folderNumber: String(row.folderNumber || row['Folder Number'] || row['Folder'] || '').trim(),
          clientNumber: String(row.clientNumber || row['Client Number'] || row['Client No'] || '').trim(),
          tmNumber: row.tmNumber || row['TM Number'] ? String(row.tmNumber || row['TM Number']).trim() : undefined,
          applicantName: String(row.applicantName || row['Applicant Name'] || row['Applicant'] || '').trim(),
          class: row.class || row['Class'] ? String(row.class || row['Class']).trim() : undefined,
          filingDate: row.filingDate || row['Filing Date'] ? String(row.filingDate || row['Filing Date']).trim() : undefined,
          stage: row.stage || row['Stage'] ? parseInt(row.stage || row['Stage'], 10) : 1,
          subStage: row.subStage || row['Sub Stage'] || row['SubStage'] ? String(row.subStage || row['Sub Stage'] || row['SubStage']).trim() : undefined,
          notes: row.notes || row['Notes'] ? String(row.notes || row['Notes']).trim() : undefined,
        })).filter(row => row.folderNumber && row.applicantName); // Filter out empty rows

        setParsedRows(mappedData);
      } catch (err) {
        console.error("Error parsing Excel:", err);
        toast({
          title: "Parse Error",
          description: "Could not read the Excel file. Make sure it's a valid .xlsx or .csv format.",
          variant: "destructive"
        });
        setParsedRows([]);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = () => {
    if (parsedRows.length === 0) return;

    importCases.mutate(
      { data: { rows: parsedRows } },
      {
        onSuccess: (data) => {
          setImportResult(data);
          toast({
            title: "Import Complete",
            description: `Successfully imported ${data.imported} cases.`,
          });
        },
        onError: (error: any) => {
          toast({
            title: "Import Failed",
            description: error?.response?.data?.error || "An unexpected error occurred during import.",
            variant: "destructive"
          });
        }
      }
    );
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "Folder Number": "TM-2024-001",
        "Client Number": "C-1001",
        "TM Number": "987654321",
        "Applicant Name": "Acme Corp",
        "Class": "9, 42",
        "Filing Date": "2024-01-15",
        "Stage": 1,
        "Sub Stage": "Awaiting filing receipt",
        "Notes": "Priority application"
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "TM_Import_Template.xlsx");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Import</h1>
        <p className="text-muted-foreground mt-1">Upload an Excel spreadsheet to bulk create case files.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Upload File</CardTitle>
            <CardDescription>Select an Excel file (.xlsx, .xls) containing your cases data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Click to select file</p>
              <p className="text-xs text-muted-foreground mt-1">{file ? file.name : "No file selected"}</p>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
              />
            </div>

            <div className="space-y-2 text-sm text-muted-foreground bg-muted/30 p-4 rounded-md">
              <p className="font-medium text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Required Columns
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Folder Number</li>
                <li>Applicant Name</li>
                <li>Client Number (if linking to client)</li>
              </ul>
              <Button variant="link" className="p-0 h-auto text-primary" onClick={downloadTemplate}>
                <Download className="h-3 w-3 mr-1" /> Download Template
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Data Preview</CardTitle>
              <CardDescription>Review the parsed data before confirming import.</CardDescription>
            </div>
            {parsedRows.length > 0 && !importResult && (
              <Button onClick={handleImport} disabled={importCases.isPending}>
                <Upload className="h-4 w-4 mr-2" /> 
                {importCases.isPending ? "Importing..." : `Import ${parsedRows.length} Records`}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {importResult ? (
              <div className="space-y-6">
                <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <CheckCircle2 className="h-4 w-4 stroke-emerald-600" />
                  <AlertTitle>Import Successful</AlertTitle>
                  <AlertDescription>
                    {importResult.imported} cases imported successfully. {importResult.skipped > 0 && `${importResult.skipped} rows skipped.`}
                  </AlertDescription>
                </Alert>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-destructive">Errors during import</h4>
                    <div className="bg-destructive/10 text-destructive text-sm rounded-md p-4 max-h-[200px] overflow-y-auto">
                      <ul className="list-disc pl-5 space-y-1">
                        {importResult.errors.map((err: any, i: number) => (
                          <li key={i}>Row {err.row}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
                <div className="pt-4 flex justify-end">
                  <Button variant="outline" onClick={() => { setFile(null); setParsedRows([]); setImportResult(null); }}>
                    Upload Another File
                  </Button>
                </div>
              </div>
            ) : isParsing ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground animate-pulse">
                Parsing spreadsheet...
              </div>
            ) : parsedRows.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-md bg-muted/10">
                Upload a file to see preview
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden max-h-[500px] flex flex-col">
                <div className="overflow-auto flex-1">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Folder No.</TableHead>
                        <TableHead className="whitespace-nowrap">Client No.</TableHead>
                        <TableHead className="whitespace-nowrap">Applicant</TableHead>
                        <TableHead className="whitespace-nowrap">TM No.</TableHead>
                        <TableHead className="whitespace-nowrap">Stage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.slice(0, 50).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs font-semibold">{row.folderNumber}</TableCell>
                          <TableCell className="font-mono text-xs">{row.clientNumber}</TableCell>
                          <TableCell className="truncate max-w-[150px]" title={row.applicantName}>{row.applicantName}</TableCell>
                          <TableCell className="font-mono text-xs">{row.tmNumber || '-'}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                              Stage {row.stage}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedRows.length > 50 && (
                  <div className="bg-muted/50 p-2 text-center text-xs text-muted-foreground font-medium">
                    Showing first 50 rows of {parsedRows.length}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
