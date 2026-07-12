import { useState } from 'react';
import type { NashmWorkbook, WorkbookSheet } from 'nashm-data-provider';
import { cn } from '~/utils';

interface WorkbookPreviewProps {
  data: NashmWorkbook;
  direction?: 'rtl' | 'ltr' | 'auto';
}

const TEMPLATE_STYLES: Record<string, {
  headerBg: string;
  headerText: string;
  gridHeaderBg: string;
  accentText: string;
  cardStyle: string;
}> = {
  'nashm-finance-dashboard': {
    headerBg: 'bg-emerald-950',
    headerText: 'text-emerald-100',
    gridHeaderBg: 'bg-emerald-50/50 text-emerald-900',
    accentText: 'text-emerald-600',
    cardStyle: 'border-emerald-100 bg-emerald-50/20',
  },
  'nashm-project-tracker': {
    headerBg: 'bg-indigo-950',
    headerText: 'text-indigo-100',
    gridHeaderBg: 'bg-indigo-50/50 text-indigo-900',
    accentText: 'text-indigo-600',
    cardStyle: 'border-indigo-100 bg-indigo-50/20',
  },
  'nashm-crm-table': {
    headerBg: 'bg-slate-900',
    headerText: 'text-slate-100',
    gridHeaderBg: 'bg-slate-100 text-slate-700',
    accentText: 'text-slate-600',
    cardStyle: 'border-slate-200 bg-slate-50/50',
  },
  'nashm-inventory': {
    headerBg: 'bg-amber-950',
    headerText: 'text-amber-100',
    gridHeaderBg: 'bg-amber-50/50 text-amber-900',
    accentText: 'text-amber-600',
    cardStyle: 'border-amber-100 bg-amber-50/20',
  },
  'nashm-survey-analysis': {
    headerBg: 'bg-sky-950',
    headerText: 'text-sky-100',
    gridHeaderBg: 'bg-sky-50/50 text-sky-900',
    accentText: 'text-sky-600',
    cardStyle: 'border-sky-100 bg-sky-50/20',
  },
};

export default function WorkbookPreview({ data, direction }: WorkbookPreviewProps) {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const templateId = data.templateId || 'nashm-finance-dashboard';
  const style = TEMPLATE_STYLES[templateId] || TEMPLATE_STYLES['nashm-finance-dashboard'];
  const sheets = data.content?.sheets || [];
  const currentSheet = sheets[activeSheetIndex] as WorkbookSheet | undefined;

  const isRTL = direction === 'rtl' || (direction === 'auto' && data.locale?.startsWith('ar'));

  if (sheets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-text-secondary">
        No worksheets available.
      </div>
    );
  }

  // Generate column labels (A, B, C...)
  const getColLetter = (index: number) => {
    let temp = index;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const isNumber = (val: string | number) => typeof val === 'number';

  // Highlight specific rows (e.g. containing Total / مجموع)
  const isTotalRow = (row: Array<string | number>) => {
    return row.some(
      (cell) =>
        typeof cell === 'string' &&
        (cell.toLowerCase().includes('total') ||
          cell.toLowerCase().includes('sum') ||
          cell.includes('مجموع') ||
          cell.includes('إجمالي')),
    );
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface-primary-alt overflow-hidden">
      {/* Excel Title Top bar */}
      <div className="flex items-center justify-between border-b border-border-light bg-surface-primary px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary">{data.title}</span>
          <span className="rounded bg-surface-hover px-1.5 py-0.5 text-text-secondary">
            {templateId.replace('nashm-', '')}
          </span>
        </div>
        <div className="text-text-secondary">
          {sheets.length} {sheets.length === 1 ? 'Sheet' : 'Sheets'}
        </div>
      </div>

      {/* Main Grid + KPI workspace */}
      <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto gap-6 select-text" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        {/* Summary KPIs */}
        {currentSheet?.summary && currentSheet.summary.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {currentSheet.summary.map((item, idx) => (
              <div
                key={idx}
                className={cn('rounded-xl border p-4 shadow-sm transition-all duration-300 flex flex-col justify-between', style.cardStyle)}
              >
                <div className="text-xs font-semibold uppercase opacity-65 tracking-wider truncate">
                  {item.label}
                </div>
                <div className={cn('text-2xl font-bold mt-2 truncate', style.accentText)}>
                  {typeof item.value === 'number'
                    ? item.value.toLocaleString(data.locale || undefined)
                    : item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Spreadsheet Sheet Grid Frame */}
        {currentSheet && (
          <div className="flex-1 min-h-[300px] border border-border-medium rounded-xl bg-white shadow-sm overflow-auto flex flex-col">
            <table className="w-full border-collapse text-xs select-text">
              {/* Spreadsheet headers (Column A, B, C...) */}
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] select-none text-center">
                  <th className="w-10 border-b border-r border-slate-200 bg-slate-100/80 sticky top-0 left-0 z-20"></th>
                  {currentSheet.headers.map((_, colIdx) => (
                    <th
                      key={colIdx}
                      className="px-3 py-1 font-semibold border-b border-r border-slate-200 bg-slate-100/80 sticky top-0 z-10 w-40 min-w-28"
                    >
                      {getColLetter(colIdx)}
                    </th>
                  ))}
                </tr>

                {/* Actual Header Names row */}
                <tr className={cn('font-bold border-b border-slate-300 shadow-sm text-center select-none', style.headerBg, style.headerText)}>
                  <th className="border-r border-slate-300 sticky left-0 z-10 bg-slate-100 text-slate-500 font-mono w-10">
                    1
                  </th>
                  {currentSheet.headers.map((hdr, idx) => (
                    <th key={idx} className="px-4 py-2.5 font-bold border-r border-slate-300 tracking-wide text-left text-sm" style={{ textAlign: isRTL ? 'right' : 'left' }}>
                      {hdr}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Rows */}
              <tbody>
                {currentSheet.rows.map((row, rowIdx) => {
                  const isTotal = isTotalRow(row);
                  return (
                    <tr
                      key={rowIdx}
                      className={cn(
                        'border-b border-slate-150 transition-colors',
                        isTotal
                          ? 'bg-slate-100 font-bold text-slate-900 border-t border-b-2 border-slate-400'
                          : rowIdx % 2 === 0
                            ? 'bg-white hover:bg-slate-50/60'
                            : 'bg-slate-50/30 hover:bg-slate-50/60',
                      )}
                    >
                      {/* Row indicators on left */}
                      <td className="bg-slate-100 text-slate-500 border-r border-slate-200 py-2.5 text-center font-mono select-none font-semibold sticky left-0 w-10">
                        {rowIdx + 2}
                      </td>

                      {/* Cell Data */}
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className={cn(
                            'px-4 py-2 border-r border-slate-150 truncate',
                            isNumber(cell) ? 'text-right font-mono' : 'text-left',
                            isRTL && !isNumber(cell) && 'text-right',
                          )}
                          style={{
                            textAlign: isRTL && !isNumber(cell) ? 'right' : isNumber(cell) ? 'right' : 'left',
                          }}
                        >
                          {isNumber(cell)
                            ? cell.toLocaleString(data.locale || undefined)
                            : cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabs list at bottom */}
      <div className="border-t border-border-light bg-surface-primary px-4 py-2 flex items-center justify-between overflow-x-auto">
        <div className="flex gap-1.5 scrollbar-thin">
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheetIndex(idx)}
              className={cn(
                'px-4 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-sm shrink-0 border',
                idx === activeSheetIndex
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ring-1 ring-emerald-500/10'
                  : 'bg-surface-primary-alt border-border-light text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              )}
            >
              {sheet.name}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono text-text-secondary select-none">
          Nashm Excel v1.0
        </span>
      </div>
    </div>
  );
}
