import React, { memo } from 'react';

const FileUploadSection = memo(({ onFileUpload }: { onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
  console.log('FileUploadSection 重新渲染'); // 调试日志
  return <input type="file" accept=".xlsx,.xls" onChange={onFileUpload} />;
});

export default FileUploadSection;