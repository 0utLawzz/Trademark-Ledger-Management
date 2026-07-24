import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGlobalSearch } from "@workspace/api-client-react";
import { Search as SearchIcon, Building2, Briefcase, ChevronRight } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useGlobalSearch({ q: debouncedQuery }, { query: { enabled: debouncedQuery.length > 1 } });

  const hasResults = data && (data.clients.length > 0 || data.cases.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold tracking-tight">Global Search</h1>
        <p className="text-muted-foreground">Search across all clients, folder numbers, and applicant names.</p>
        
        <div className="relative max-w-2xl mx-auto mt-6">
          <SearchIcon className="absolute left-4 top-4 h-6 w-6 text-muted-foreground" />
          <Input
            className="pl-14 h-14 text-lg bg-card border-2 focus-visible:ring-primary shadow-sm"
            placeholder="Type at least 2 characters to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="space-y-8">
        {debouncedQuery.length <= 1 ? (
          <div className="text-center py-12 text-muted-foreground">
            Enter a search term to begin.
          </div>
        ) : isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-1/4 bg-muted rounded"></div>
            <div className="h-24 bg-muted rounded-md"></div>
            <div className="h-24 bg-muted rounded-md"></div>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12 text-muted-foreground">
            No results found for "{debouncedQuery}".
          </div>
        ) : (
          <>
            {data.cases.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Cases <Badge variant="secondary" className="ml-2">{data.cases.length}</Badge>
                </h2>
                <div className="grid gap-3">
                  {data.cases.map(c => (
                    <Link key={`case-${c.id}`} href={`/cases/${c.folderNumber}`}>
                      <Card className="hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-mono font-bold text-primary">{c.folderNumber}</span>
                              <Badge variant="outline" className="text-[10px]">STAGE {c.stage}</Badge>
                            </div>
                            <div className="font-medium text-foreground">{c.applicantName}</div>
                            <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                              {c.tmNumber && <span>TM: <span className="font-mono">{c.tmNumber}</span></span>}
                              {c.clientName && <span>Client: {c.clientName}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {data.clients.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 border-b pb-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Clients <Badge variant="secondary" className="ml-2">{data.clients.length}</Badge>
                </h2>
                <div className="grid gap-3">
                  {data.clients.map(c => (
                    <Link key={`client-${c.id}`} href={`/clients/${c.id}`}>
                      <Card className="hover:border-primary/50 hover:bg-muted/20 transition-all cursor-pointer group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-lg">{c.name}</span>
                              <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.clientNumber}</span>
                            </div>
                            <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                              {c.email && <span>{c.email}</span>}
                              {c.phone && <span>{c.phone}</span>}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
