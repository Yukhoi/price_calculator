import React, { useState, useMemo, useCallback, memo } from 'react';
import * as XLSX from 'xlsx';
import StaticHeader from './StaticHeader';
import ErrorBoundary from './ErrorBoundary';
import FileUploadSection from './FileUploadSection';

interface ExcelData {
  [key: string]: any;
}

// 优化的日期筛选组件 - 添加更深层的 memo
const DateFilter = memo(({ 
  startDate, 
  endDate, 
  onStartDateChange, 
  onEndDateChange 
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  console.log('DateFilter 重新渲染'); // 调试日志
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>日期范围筛选：</label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div>
          <label>开始日期: </label>
          <input 
            type="date" 
            value={startDate} 
            onChange={onStartDateChange}
          />
        </div>
        <div>
          <label>结束日期: </label>
          <input 
            type="date" 
            value={endDate} 
            onChange={onEndDateChange}
          />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数 - 只有当日期真的改变时才重新渲染
  return prevProps.startDate === nextProps.startDate && 
         prevProps.endDate === nextProps.endDate;
});

// 简化的客户筛选组件 - 使用基本的 memo
const ClientFilter = memo(({ 
  allClients, 
  selectedClients, 
  onClientChange 
}: {
  allClients: string[];
  selectedClients: string[];
  onClientChange: (client: string) => void;
}) => {
  
  // 添加安全检查
  if (!allClients || !Array.isArray(allClients)) {
    return <div>客户数据加载中...</div>;
  }
  
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.5rem' }}>客户筛选 (可多选)：</label>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '0.5rem',
        maxHeight: '120px',
        overflowY: 'auto',
        border: '1px solid #ccc',
        padding: '0.5rem',
        borderRadius: '4px'
      }}>
        {allClients.map(client => (
          <label key={client} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="checkbox"
              checked={selectedClients.includes(client)}
              onChange={() => onClientChange(client)}
            />
            {client}
          </label>
        ))}
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
        已选择: {selectedClients.length > 0 ? selectedClients.join(', ') : '全部'}
      </div>
    </div>
  );
});

// 简化的结果显示组件
const ResultDisplay = memo(({ 
  filteredData, 
  formatOutput, 
  totalPrice,
  formatJsonForDisplay
}: {
  filteredData: ExcelData[];
  formatOutput: string;
  totalPrice: number;
  formatJsonForDisplay: ExcelData[];
}) => {
  console.log('ResultDisplay 重新渲染'); // 调试日志
  
  // 添加安全检查
  if (!filteredData || !Array.isArray(filteredData)) {
    return <div>数据加载中...</div>;
  }
  
  return (
    <div>
      <h3>筛选结果 ({filteredData.length} 条记录)：</h3>
      
      {/* 格式化文本输出 */}
      <div style={{ marginBottom: '1rem' }}>
        <h4>格式化输出：</h4>
        <textarea
          value={formatOutput || ''}
          readOnly
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            resize: 'vertical'
          }}
        />
        <div style={{ 
          marginTop: '0.5rem', 
          fontSize: '16px', 
          fontWeight: 'bold', 
          color: '#28a745',
          padding: '0.5rem',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          总价格: {(totalPrice || 0).toFixed(2)}
        </div>
      </div>

      {/* JSON 格式 - 使用格式化的日期 */}
      <div>
        <h4>JSON 格式：</h4>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '1rem', 
          borderRadius: '4px',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          {JSON.stringify(formatJsonForDisplay, null, 2)}
        </pre>
      </div>
    </div>
  );
});


const ExcelUploader: React.FC = () => {
  const [jsonData, setJsonData] = useState<ExcelData[] | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // 获取所有唯一的客户名字 - 添加安全检查
  const allClients = useMemo(() => {
    try {
      if (!jsonData || !Array.isArray(jsonData)) return [];
      const clients = jsonData.map(item => item.CLIENT).filter(Boolean);
      return [...new Set(clients)].sort();
    } catch (error) {
      console.error('获取客户列表出错:', error);
      return [];
    }
  }, [jsonData]);

  // 增强的日期解析函数 - 自动识别多种格式
const parseDate = (dateValue: any): Date => {
    if (!dateValue && dateValue !== 0) {
        console.warn('空的日期值:', dateValue);
        return new Date();
    }

    try {
        console.log('开始解析日期:', dateValue, '类型:', typeof dateValue);
        // 如果是字符串
        if (typeof dateValue === 'string') {
            const dateStr = dateValue;
            console.log('开始解析字符串日期:', dateStr);

            // 自动检测并处理多种日期格式

            // 1. 处理 "dd.mm.yyyy" 格式 (如: 24.12.2024)
            if (dateStr.includes('.')) {
                console.log('检测到点号分隔符，尝试解析 dd.mm.yyyy 格式');
                const parts = dateStr.split('.');
                console.log('分割后的部分:', parts);

                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10);
                    const year = parseInt(parts[2], 10);

                    console.log('解析的数值:', { day, month, year });

                    if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
                            day >= 1 && day <= 31 && month >= 1 && month <= 12 &&
                            year >= 1900 && year <= 2100) {
                        console.log('✅ 成功解析 dd.mm.yyyy 格式:', dateStr, '结果:', { day, month, year });
                        return new Date(year, month - 1, day);
                    } else {
                        console.warn('❌ dd.mm.yyyy 格式验证失败:', { day, month, year, isValidDay: day >= 1 && day <= 31, isValidMonth: month >= 1 && month <= 12, isValidYear: year >= 1900 && year <= 2100 });
                    }
                } else {
                    console.warn('❌ 点号分隔符格式错误，部分数量:', parts.length);
                }
            }

            // 2. 处理 "yyyy-mm-dd" 或 "dd-mm-yyyy" 格式
            if (dateStr.includes('-')) {
                console.log('检测到连字符分隔符，尝试解析 yyyy-mm-dd 或 dd-mm-yyyy 格式');
                const parts = dateStr.split('-');
                console.log('分割后的部分:', parts);

                if (parts.length === 3) {
                    // 检查是否是 yyyy-mm-dd 格式（第一部分是4位年份）
                    if (parts[0].length === 4) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const day = parseInt(parts[2], 10);

                        console.log('尝试 yyyy-mm-dd 格式:', { year, month, day });

                        if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
                                day >= 1 && day <= 31 && month >= 1 && month <= 12 &&
                                year >= 1900 && year <= 2100) {
                            console.log('✅ 成功解析 yyyy-mm-dd 格式:', dateStr);
                            return new Date(year, month - 1, day);
                        }
                    }

                    // 检查是否是 dd-mm-yyyy 格式（第三部分是4位年份）
                    if (parts[2].length === 4) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);

                        console.log('尝试 dd-mm-yyyy 格式:', { day, month, year });

                        if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
                                day >= 1 && day <= 31 && month >= 1 && month <= 12 &&
                                year >= 1900 && year <= 2100) {
                            console.log('✅ 成功解析 dd-mm-yyyy 格式:', dateStr);
                            return new Date(year, month - 1, day);
                        }
                    }
                }
            }

            // 3. 处理 "dd/mm/yyyy" 或 "yyyy/mm/dd" 格式
            if (dateStr.includes('/')) {
                console.log('检测到斜杠分隔符，尝试解析 dd/mm/yyyy 或 yyyy/mm/dd 格式');
                const parts = dateStr.split('/');
                console.log('分割后的部分:', parts);

                if (parts.length === 3) {
                    // 尝试 dd/mm/yyyy 格式
                    if (parts[2].length === 4) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const year = parseInt(parts[2], 10);

                        console.log('尝试 dd/mm/yyyy 格式:', { day, month, year });

                        if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
                                day >= 1 && day <= 31 && month >= 1 && month <= 12 &&
                                year >= 1900 && year <= 2100) {
                            console.log('✅ 成功解析 dd/mm/yyyy 格式:', dateStr);
                            return new Date(year, month - 1, day);
                        }
                    }

                    // 尝试 yyyy/mm/dd 格式
                    if (parts[0].length === 4) {
                        const year = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10);
                        const day = parseInt(parts[2], 10);

                        console.log('尝试 yyyy/mm/dd 格式:', { year, month, day });

                        if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
                                day >= 1 && day <= 31 && month >= 1 && month <= 12 &&
                                year >= 1900 && year <= 2100) {
                            console.log('✅ 成功解析 yyyy/mm/dd 格式:', dateStr);
                            return new Date(year, month - 1, day);
                        }
                    }
                }
            }

            console.warn('❌ 所有日期格式解析都失败，无法解析的日期格式:', dateStr);
            return new Date();
        }
        else if (typeof dateValue === 'number') {
          /**
           * Excel 1900 日期系统处理：
           * - 序列号1对应1900年1月1日
           * - 序列号2对应1900年1月2日
           * - 以此类推...
           * - Excel错误地将1900年当作闰年，认为1900年2月29日存在（序列号60）
           * - 从1900年3月1日开始（序列号61），所有日期都比实际日期晚1天
           * 
           * 修正方法：
           * - 对于序列号1-59：直接计算（1900年1月1日到1900年2月28日）
           * - 对于序列号>=61：减去2来修正（跳过不存在的1900年2月29日）
           */
          
          console.log('Excel日期序列号:', dateValue);
          
          if (dateValue === 60) {
            // Excel认为的1900年2月29日，这个日期实际不存在，应该是1900年2月28日
            console.log('处理Excel错误的闰年日期60，返回1900年2月28日');
            return new Date(1900, 1, 28); // 1900年2月28日
          } else if (dateValue >= 61) {
            // 1900年3月1日及之后，需要减去2（1个基准偏移 + 1个闰年错误修正）
            const epoch = new Date(1900, 0, 1); // 1900年1月1日
            const adjustedDays = dateValue - 2; // 减去2天修正
            epoch.setDate(epoch.getDate() + adjustedDays);
            console.log('处理序列号>=61:', dateValue, '调整后天数:', adjustedDays, '结果:', epoch);
            return epoch;
          } else {
            // 1900年1月1日到1900年2月28日，直接计算
            const epoch = new Date(1900, 0, 1); // 1900年1月1日
            const adjustedDays = dateValue - 1; // 减去1天因为序列号1对应1月1日
            epoch.setDate(epoch.getDate() + adjustedDays);
            console.log('处理序列号1-59:', dateValue, '调整后天数:', adjustedDays, '结果:', epoch);
            return epoch;
          }
        }
        // 如果是Date对象
        else if (dateValue instanceof Date) {
            return dateValue;
        }

        console.warn('未知的日期类型:', typeof dateValue, dateValue);
        return new Date();

    } catch (error) {
        console.error('日期解析错误:', error, '原始值:', dateValue);
        return new Date();
    }
};

  // 智能格式化日期显示 - 根据原始数据格式决定输出格式
  const formatDateForDisplay = (date: Date, originalValue?: any): string => {
    console.log('formatDateForDisplay', date, '原始值:', originalValue);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    // 如果有原始值，尝试检测其格式并保持一致
    if (originalValue && typeof originalValue === 'string') {
      const str = originalValue.trim();
      // 如果原始格式是 yyyy-mm-dd 或 yyyy/mm/dd，使用 yyyy-mm-dd 格式
      if (str.match(/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/)) {
        return `${year}-${month}-${day}`;
      }
    }
    
    // 默认使用 dd.mm.yyyy 格式（欧洲常用格式）
    return `${day}.${month}.${year}`;
  };

  // 筛选后的数据 - 增强错误处理
  const filteredData = useMemo(() => {
    try {
      console.log('filteredData');
      if (!jsonData || !Array.isArray(jsonData)) {
        console.log('没有数据或数据格式错误');
        return [];
      }
      
      console.log('开始筛选数据, 总数:', jsonData.length, '筛选条件:', { startDate, endDate, selectedClients: selectedClients.length });
      
      const result = jsonData.filter(item => {
        if (!item) {
          console.warn('发现空数据项');
          return false;
        }
        
        // 日期筛选
        if (startDate || endDate) {
          try {
            const itemDateValue = item['日期'];
            console.log('itemDateValue', itemDateValue)
            if (!itemDateValue && itemDateValue !== 0) {
              console.warn('数据项缺少日期字段:', item);
              return false;
            }
            
            const itemDate = parseDate(itemDateValue);
            console.log('解析后的日期:', itemDate, '原始值:', itemDateValue);
            
            // 验证解析后的日期是否有效
            if (isNaN(itemDate.getTime())) {
              console.warn('无效的日期:', itemDateValue);
              return false;
            }
            
            // 开始日期筛选（包含当天）
            if (startDate) {
              const startDateTime = new Date(startDate);
              if (isNaN(startDateTime.getTime())) {
                console.warn('无效的开始日期:', startDate);
              } else {
                startDateTime.setHours(0, 0, 0, 0);
                if (itemDate < startDateTime) {
                  return false;
                }
              }
            }
            
            // 结束日期筛选（包含当天）
            if (endDate) {
              const endDateTime = new Date(endDate);
              if (isNaN(endDateTime.getTime())) {
                console.warn('无效的结束日期:', endDate);
              } else {
                endDateTime.setHours(23, 59, 59, 999);
                if (itemDate > endDateTime) {
                  return false;
                }
              }
            }
          } catch (dateError) {
            console.error('日期筛选出错:', dateError, '数据项:', item);
            return false;
          }
        }
        
        // 客户筛选
        if (selectedClients.length > 0) {
          const clientName = item.CLIENT;
          if (!clientName || !selectedClients.includes(clientName)) {
            return false;
          }
        }
        
        return true;
      });
      
      console.log('筛选完成，结果数量:', result.length);
      return result;
      
    } catch (error) {
      console.error('筛选数据出错:', error);
      return [];
    }
  }, [jsonData, startDate, endDate, selectedClients]);

  // 转换JSON数据中的日期格式用于显示
  const formatJsonForDisplay = useMemo(() => {
    console.log('formatJsonForDisplay');
    if (!filteredData || !Array.isArray(filteredData)) return [];
    
    return filteredData.map(item => {
      const newItem = { ...item };
      // 如果是字符串日期，解析后重新格式化以保持一致性
      
      const date = parseDate(newItem['日期']);
      console.log('原始日期:', newItem['日期'], '解析后的日期:', date);
      newItem['日期'] = formatDateForDisplay(date, newItem['DATE']);
      console.log('转换后的日期:', newItem['DATE']);
      
      return newItem;
    });
  }, [filteredData]);

  // 转换原始JSON数据中的日期格式用于显示
  const formatOriginalJsonForDisplay = useMemo(() => {
    console.log('formatOriginalJsonForDisplay');
    if (!jsonData || !Array.isArray(jsonData)) return [];
    
    return jsonData.map(item => {
      console.log('处理原始数据项:', item);
      const newItem = { ...item };
      // 如果是字符串日期，解析后重新格式化以保持一致性
      const date = parseDate(newItem['日期']);
      console.log('原始日期:', newItem['日期'], '解析后的日期:', date);
      newItem['日期'] = formatDateForDisplay(date, newItem['DATE']);
      console.log('转换后的日期:', newItem['DATE']);
      return newItem;
    });
  }, [jsonData]);

  // 计算总价格 - 添加安全检查
  const totalPrice = useMemo(() => {
    console.log('计算总价格');
    try {
      if (!filteredData || !Array.isArray(filteredData)) return 0;
      return filteredData.reduce((sum, item) => {
        const price = parseFloat(item?.PRIX) || 0;
        return sum + price;
      }, 0);
    } catch (error) {
      console.error('计算总价格出错:', error);
      return 0;
    }
  }, [filteredData]);

  // 格式化输出文本 - 添加安全检查
  const formatOutput = useMemo(() => {
    console.log('formatOutput');
    try {
      if (!filteredData || !Array.isArray(filteredData)) return '';
      return filteredData.map(item => 
        `${item['NUMÉRO DE SUIVI'] || ''} ${item.DESTINATION || ''} ${item['VOLUME POIDS'] || ''}kg ${item.PRIX || ''}`
      ).join('\n');
    } catch (error) {
      console.error('格式化输出出错:', error);
      return '';
    }
  }, [filteredData]);

  // 处理客户选择 - 使用 useCallback 优化
  const handleClientChange = useCallback((client: string) => {
    setSelectedClients(prev => 
      prev.includes(client) 
        ? prev.filter(c => c !== client)
        : [...prev, client]
    );
  }, []);

  // 处理日期变化 - 使用 useCallback 优化
  const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    console.log('开始日期变化:', newDate);
    setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    console.log('结束日期变化:', newDate);
    setEndDate(newDate);
  }, []);

  // 清除筛选 - 使用 useCallback 优化
  const handleClearFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setSelectedClients([]);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });

      const sheetName = workbook.SheetNames[0]; // 默认读取第一个 sheet
      const worksheet = workbook.Sheets[sheetName];
      const json: ExcelData[] = XLSX.utils.sheet_to_json(worksheet); // 自动使用第一行作为字段名

      setJsonData(json);
    };

    reader.readAsBinaryString(file);
  };

  return (
    <ErrorBoundary>
      <div style={{ padding: '2rem' }}>
        <StaticHeader />
        
        <FileUploadSection onFileUpload={handleFileUpload} />

        {jsonData && Array.isArray(jsonData) && (
          <div style={{ marginTop: '2rem' }}>
            <h3>筛选选项：</h3>
            
            {/* 日期筛选 */}
            <ErrorBoundary>
              <DateFilter
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
              />
            </ErrorBoundary>

            {/* 客户筛选 */}
            <ErrorBoundary>
              <ClientFilter
                allClients={allClients}
                selectedClients={selectedClients}
                onClientChange={handleClientChange}
              />
            </ErrorBoundary>

            {/* 清除筛选按钮 */}
            <div style={{ marginBottom: '1rem' }}>
              <button 
                onClick={handleClearFilters}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                清除所有筛选
              </button>
            </div>

            {/* 显示筛选结果 */}
            <ErrorBoundary>
              <ResultDisplay
                filteredData={filteredData}
                formatOutput={formatOutput}
                totalPrice={totalPrice}
                formatJsonForDisplay={formatJsonForDisplay}
              />
            </ErrorBoundary>

            {/* 显示原始数据 */}
            <div style={{ marginTop: '2rem' }}>
              <h3>原始 JSON 数据 ({jsonData?.length || 0} 条记录)：</h3>
              <pre style={{ 
                backgroundColor: '#f9f9f9', 
                padding: '1rem', 
                borderRadius: '4px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {JSON.stringify(formatOriginalJsonForDisplay, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ExcelUploader;