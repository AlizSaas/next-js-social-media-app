import { useToast } from "@/components/ui/use-toast";
import { useUploadThing } from "@/lib/uploadthing";
import { useState } from "react";

export interface Attachment {
  file: File;
  mediaId?: string;
  isUploading: boolean;
}

export default function useMediaUpload() {
  const { toast } = useToast();

  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [uploadProgress, setUploadProgress] = useState<number>();

  const { startUpload, isUploading } = useUploadThing("attachment", {
    onBeforeUploadBegin(files) {
      const renamedFiles = files.map((file) => {
        const extension = file.name.split(".").pop();
        return new File(
          [file], // Preserve the file content 
          `attachment_${crypto.randomUUID()}.${extension}`,
          {
            type: file.type,
          },
        );
      }); // Rename files to avoid conflicts

      setAttachments((prev) => [
        ...prev,
        ...renamedFiles.map((file) => ({ file, isUploading: true })),
      ]); // Add new attachments to the end of the state array

      return renamedFiles;
    },
    
    onUploadProgress: setUploadProgress, // Update upload progress state 
    onClientUploadComplete(res) {
      setAttachments((prev) =>
        prev.map((a) => {
          const uploadResult = res.find((r) => r.name === a.file.name); // Find the upload result for this attachment 

          if (!uploadResult) return a;

          return {
            ...a,
            mediaId: uploadResult.serverData.mediaId, // Assign the mediaId from the upload result
            isUploading: false, // Mark as no longer uploading
          };
        }),
      );
    },
    onUploadError(e) {
      setAttachments((prev) => prev.filter((a) => !a.isUploading)); // Remove failed uploads from state
      toast({
        variant: "destructive",
        description: e.message,
      });
    },
  });

  function handleStartUpload(files: File[]) {
    if (isUploading) {
      toast({
        variant: "destructive",
        description: "Please wait for the current upload to finish.",
      });
      return;
    }

    if (attachments.length + files.length > 5) {
      toast({
        variant: "destructive",
        description: "You can only upload up to 5 attachments per post.",
      });
      return;
    }

    startUpload(files);
  }

  function removeAttachment(fileName: string) {
    setAttachments((prev) => prev.filter((a) => a.file.name !== fileName)); // Remove attachment by file name 
  }

  function reset() {
    setAttachments([]);
    setUploadProgress(undefined);
  }

  return {
    startUpload: handleStartUpload,
    attachments,
    isUploading,
    uploadProgress,
    removeAttachment,
    reset,
  };
}