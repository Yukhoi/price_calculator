import React, { memo } from 'react';

const FileUploadSection = memo(({ onFileUpload }: { onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  return <input type="file" accept=".xlsx,.xls" onChange={onFileUpload} />;
});

export default FileUploadSection;