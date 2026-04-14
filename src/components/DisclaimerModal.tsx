import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DISCLAIMER_KEY = "disclaimer_accepted";

export function DisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISCLAIMER_KEY)) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, "true");
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">Disclaimer</AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
            The information provided in this app is for{" "}
            <span className="font-semibold text-foreground">informational and educational purposes only</span> and
            does not constitute financial advice, investment advice, trading advice, or any other sort of advice.
            <br /><br />
            You should not make any decision, financial or otherwise, based on any of the information presented
            here without undertaking independent due diligence and consulting with a professional financial advisor.
            <br /><br />
            By agreeing, you acknowledge that you use this app at your own risk and that the developers are not
            responsible for any financial losses or decisions made based on the content shown.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAccept} className="w-full">
            I Understand & Agree
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
