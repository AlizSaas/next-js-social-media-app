import { useToast } from "@/components/ui/use-toast";
import { compressImage } from "@/lib/compressImage";
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
    async onBeforeUploadBegin(files) {
      const processedFiles = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file);
          const extension = compressed.name.split(".").pop();
          return new File(
            [compressed],
            `attachment_${crypto.randomUUID()}.${extension}`,
            { type: compressed.type },
          );
        }),
      ); // Compress images and rename files to avoid conflicts

      setAttachments((prev) => [
        ...prev,
        ...processedFiles.map((file) => ({ file, isUploading: true })),
      ]); // Add new attachments to the end of the state array

      return processedFiles;
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
      
  let message = "Upload failed";

  if (e.message.includes("FileSizeMismatch")) {
    message = "File too big. Images are auto-compressed; max 64MB for videos.";
  }

      toast({
        variant: "destructive",
        description: message,
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