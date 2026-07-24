import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCreateCase, useListClients } from "@workspace/api-client-react";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  folderNumber: z.string().min(1, "Folder Number is required"),
  clientId: z.number().min(1, "Client must be selected"),
  applicantName: z.string().min(1, "Applicant Name is required"),
  tmNumber: z.string().optional(),
  class: z.string().optional(),
  filingDate: z.string().optional(),
  stage: z.coerce.number().min(1).max(4).default(1),
  subStage: z.string().optional(),
  notes: z.string().optional(),
});

export default function NewCasePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [openClientCombo, setOpenClientCombo] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClientSearch(clientSearch), 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const { data: clientsData, isLoading: loadingClients } = useListClients({ q: debouncedClientSearch, limit: 10 });
  const createCase = useCreateCase();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      folderNumber: "",
      clientId: 0,
      applicantName: "",
      tmNumber: "",
      class: "",
      filingDate: "",
      stage: 1,
      subStage: "",
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // If filingDate is empty string, don't send it or send as undefined
    const submitValues = { ...values };
    if (!submitValues.filingDate) delete submitValues.filingDate;

    createCase.mutate(
      { data: submitValues },
      {
        onSuccess: (data) => {
          toast({ title: "Case created successfully." });
          setLocation(`/cases/${data.folderNumber}`);
        },
        onError: (error: any) => {
          toast({
            title: "Error creating case",
            description: error?.response?.data?.error || "An unexpected error occurred.",
            variant: "destructive",
          });
        },
      }
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation('/cases')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Trademark Case</h1>
          <p className="text-muted-foreground mt-1">Open a new file in the ledger.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>Enter the primary details for the new trademark application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="folderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Folder Number <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. TM-2024-001" className="font-mono" {...field} />
                      </FormControl>
                      <FormDescription>Unique internal reference number.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2">Client <span className="text-destructive">*</span></FormLabel>
                      <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value && clientsData?.data
                                ? clientsData.data.find(
                                    (c) => c.id === field.value
                                  )?.name || "Select client..."
                                : "Select client..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Search clients..." 
                              value={clientSearch}
                              onValueChange={setClientSearch}
                            />
                            <CommandList>
                              <CommandEmpty>No client found.</CommandEmpty>
                              <CommandGroup>
                                {clientsData?.data?.map((client) => (
                                  <CommandItem
                                    value={client.name}
                                    key={client.id}
                                    onSelect={() => {
                                      form.setValue("clientId", client.id);
                                      setOpenClientCombo(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        client.id === field.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <span className="font-medium mr-2">{client.name}</span>
                                    <span className="text-xs text-muted-foreground font-mono">{client.clientNumber}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="applicantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applicant Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Legal name of applicant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tmNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TM Application Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Official registry number" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="class"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class(es)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 9, 35, 42" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="filingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filing Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Stage</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        >
                          <option value={1}>Stage 1: Filing</option>
                          <option value={2}>Stage 2: Examination</option>
                          <option value={3}>Stage 3: Publication</option>
                          <option value={4}>Stage 4: Registration</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Add initial notes..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation('/cases')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCase.isPending}>
                  {createCase.isPending ? "Creating..." : "Create Case File"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
