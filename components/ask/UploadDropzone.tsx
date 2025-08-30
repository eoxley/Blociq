interface UploadDropzoneProps {
  onResult: (result: any) => void;
  defaultBuildingId: string | null;
}

export function UploadDropzone({ onResult, defaultBuildingId }: UploadDropzoneProps) {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <p className="text-gray-500">Document upload temporarily disabled during OCR integration</p>
    </div>
  );
}
