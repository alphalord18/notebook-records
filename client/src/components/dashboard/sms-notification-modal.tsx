import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useState } from "react";

interface SmsNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (template: string) => void;
  recipientCount: number;
  previewData?: {
    parentName: string;
    studentName: string;
    subject: string;
    nextDate: string;
  };
  isSending?: boolean;
}

export function SmsNotificationModal({
  isOpen,
  onClose,
  onSend,
  recipientCount,
  previewData,
  isSending = false
}: SmsNotificationModalProps) {
  const [messageTemplate, setMessageTemplate] = useState(
    "Dear [Parent Name], [Student Name] did not submit their [Subject] notebook today. Please ensure submission by [next date]. Thank you."
  );

  const getPreviewMessage = () => {
    if (!previewData) return messageTemplate;
    
    let preview = messageTemplate;
    preview = preview.replace("[Parent Name]", previewData.parentName);
    preview = preview.replace("[Student Name]", previewData.studentName);
    preview = preview.replace("[Subject]", previewData.subject);
    preview = preview.replace("[next date]", previewData.nextDate);
    
    return preview;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary-500" />
            Send SMS Notifications
          </DialogTitle>
          <DialogDescription>
            This will send SMS notifications to parents of students who haven't submitted their notebook today.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <label htmlFor="message-template" className="block text-sm font-medium text-gray-700 mb-1">
              Message Template
            </label>
            <Textarea
              id="message-template"
              rows={4}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="resize-none"
              placeholder="Enter message template"
            />
            <p className="mt-1 text-xs text-gray-500">
              Available placeholders: [Parent Name], [Student Name], [Subject], [next date]
            </p>
          </div>
          
          {previewData && (
            <div className="bg-gray-50 rounded-md p-3">
              <h4 className="text-sm font-medium text-gray-900">Preview</h4>
              <p className="mt-1 text-sm text-gray-600">{getPreviewMessage()}</p>
            </div>
          )}
          
          <div className="flex items-center">
            <div className="text-sm">
              <span className="font-medium">{recipientCount} students</span> will receive notifications
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSend(messageTemplate)}
            disabled={isSending}
          >
            {isSending ? "Sending..." : "Send Notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
