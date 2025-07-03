import {memo} from "react";

const StaticHeader = memo(() => {
  console.log('StaticHeader 重新渲染 - 这应该只在初始化时出现'); // 调试日志
  return (
    <div>
      <h2>上传 Excel 文件并转换为 JSON</h2>
    </div>
  );
});

export default StaticHeader;