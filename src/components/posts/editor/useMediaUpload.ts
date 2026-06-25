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
  const [isCompressing, setIsCompressing] = useState(false);

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
      );

      setIsCompressing(false);

      setAttachments((prev) => [
        ...prev,
        ...processedFiles.map((file) => ({ file, isUploading: true })),
      ]);

      return processedFiles;
    },
    
    onUploadProgress: setUploadProgress,
    onClientUploadComplete(res) {
      setAttachments((prev) =>
        prev.map((a) => {
          const uploadResult = res.find((r) => r.name === a.file.name);

          if (!uploadResult) return a;

          return {
            ...a,
            mediaId: uploadResult.serverData.mediaId,
            isUploading: false,
          };
        }),
      );
    },
    onUploadError(e) {
      setAttachments((prev) => prev.filter((a) => !a.isUploading));
      setIsCompressing(false);
      
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
    if (isUploading || isCompressing) {
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

    setIsCompressing(true);
    startUpload(files);
  }

  function removeAttachment(fileName: string) {
    setAttachments((prev) => prev.filter((a) => a.file.name !== fileName));
  }

  function reset() {
    setAttachments([]);
    setUploadProgress(undefined);
    setIsCompressing(false);
  }

  return {
    startUpload: handleStartUpload,
    attachments,
    isUploading,
    isCompressing,
    uploadProgress,
    removeAttachment,
    reset,
  };
}