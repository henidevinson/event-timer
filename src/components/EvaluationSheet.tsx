import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EvaluationFileRecord, ParsedSheetData, WinnersData } from '../types';
import { getActiveEvaluationFile, saveEvaluationFile, deleteEvaluationFile } from '../utils/db';
import { parseSpreadsheetBlob } from '../utils/parser';
import { ConfirmModal } from './ConfirmModal';
import { InteractiveRubric } from './InteractiveRubric';
import * as XLSX from 'xlsx';

const VALID_EXTENSIONS = ['pdf', 'xlsx', 'xls', 'csv'];

interface EvaluationSheetProps {
  onSyncWinners?: (winners: WinnersData) => void;
}

export const EvaluationSheet: React.FC<EvaluationSheetProps> = ({ onSyncWinners }) => {
  const [activeTab, setActiveTab] = useState<'rubric' | 'documents'>('rubric');
  const [fileRecord, setFileRecord] = useState<EvaluationFileRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Spreadsheet parsed state
  const [spreadsheetData, setSpreadsheetData] = useState<ParsedSheetData | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // PDF blob url state
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);

  // Modal confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
    };
  }, []);

  // Process and display a loaded or newly uploaded record
  const processFile = useCallback(async (record: EvaluationFileRecord) => {
    setIsParsing(true);
    setErrorMessage(null);

    if (pdfBlobUrlRef.current) {
      URL.revokeObjectURL(pdfBlobUrlRef.current);
      pdfBlobUrlRef.current = null;
      setPdfBlobUrl(null);
    }
    setSpreadsheetData(null);
    setActiveSheetIndex(0);
    setPage(1);

    try {
      if (record.extension === 'pdf') {
        const url = URL.createObjectURL(record.blob);
        pdfBlobUrlRef.current = url;
        setPdfBlobUrl(url);
      } else if (
        record.extension === 'xlsx' || 
        record.extension === 'xls' || 
        record.extension === 'csv'
      ) {
        const parsed = await parseSpreadsheetBlob(record.blob);
        setSpreadsheetData(parsed);
      } else {
        throw new Error(`Unsupported file type: .${record.extension}. Supported formats: PDF, XLSX, XLS, CSV.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not parse or open the evaluation file.';
      setErrorMessage(msg);
    } finally {
      setIsParsing(false);
    }
  }, []);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    const loadStoredFile = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const record = await getActiveEvaluationFile();
        if (isMounted && record) {
          // If the stored file is a mock/sample file from earlier sessions, purge it
          const isMockFile =
            record.name.toLowerCase().includes('demo') ||
            record.name.toLowerCase().includes('sample') ||
            record.name.toLowerCase().includes('ideathon_judging_sheet');

          if (isMockFile) {
            await deleteEvaluationFile();
            setFileRecord(null);
          } else {
            setFileRecord(record);
            await processFile(record);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve saved evaluation file.';
          setErrorMessage(msg);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadStoredFile();
    return () => {
      isMounted = false;
    };
  }, [processFile]);

  // Unified File Processing Handler
  const handleProcessRawFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!VALID_EXTENSIONS.includes(ext)) {
      setErrorMessage(`Invalid format (.${ext || 'unknown'}). Supported: PDF, XLSX, XLS, and CSV.`);
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        await parseSpreadsheetBlob(file);
      }

      const savedRecord = await saveEvaluationFile(file);
      setFileRecord(savedRecord);
      await processFile(savedRecord);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file.';
      setErrorMessage(`Upload failed: ${msg}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Upload from file picker
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleProcessRawFile(files[0]);
    }
    if (e.target) e.target.value = '';
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessRawFile(e.dataTransfer.files[0]);
    }
  };

  // Delete file handler
  const handleDeleteFile = async () => {
    try {
      await deleteEvaluationFile();
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
        setPdfBlobUrl(null);
      }
      setFileRecord(null);
      setSpreadsheetData(null);
      setErrorMessage(null);
      setShowDeleteConfirm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete file.';
      setErrorMessage(msg);
    }
  };

  // Download current file

  const handleDownloadFile = () => {
    if (!fileRecord) return;
    const url = URL.createObjectURL(fileRecord.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileRecord.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Filter spreadsheet rows
  const activeSheet = spreadsheetData?.sheets[activeSheetIndex];
  const filteredRows = activeSheet
    ? activeSheet.rows.filter((row) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return Object.values(row).some((val) =>
          String(val).toLowerCase().includes(q)
        );
      })
    : [];

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="py-12 sm:py-16 border-b border-[#352746]">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.xlsx,.xls,.csv"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.xlsx,.xls,.csv"
        className="hidden"
      />

      <div className="max-w-5xl mx-auto">
        {/* Section Header & Tab Controls */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-[#D4AF37]" />
              <h2 className="text-xs font-mono font-medium uppercase tracking-[0.25em] text-[#AAA2B8]">
                DEPARTMENT EVALUATION CONSOLE
              </h2>
            </div>
            <p className="text-sm sm:text-base font-heading font-semibold text-[#F7F4FC] tracking-tight">
              DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING · EVALUATION
            </p>
          </div>

          {/* Tab selector */}
          <div className="inline-flex p-1 bg-[#1B1230] border border-[#352746] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('rubric')}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === 'rubric'
                  ? 'bg-[#8B5CF6] text-white font-bold'
                  : 'text-[#AAA2B8] hover:text-[#F7F4FC]'
              }`}
            >
              Rating Rubric
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-[#8B5CF6] text-white font-bold'
                  : 'text-[#AAA2B8] hover:text-[#F7F4FC]'
              }`}
            >
              Document Archive {fileRecord ? `(${fileRecord.extension.toUpperCase()})` : ''}
            </button>
          </div>
        </div>

        {/* TAB 1: OFFICIAL INTERACTIVE RUBRIC */}
        {activeTab === 'rubric' && (
          <InteractiveRubric onSyncWinners={onSyncWinners} />
        )}

        {/* TAB 2: DOCUMENTS AND UPLOADS ARCHIVE */}
        {activeTab === 'documents' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
              <div>
                <h3 className="text-xs font-mono font-medium uppercase tracking-[0.2em] text-[#AAA2B8]">
                  EVALUATION FILE ARCHIVE
                </h3>
                <p className="text-sm text-[#F7F4FC] mt-0.5">
                  Upload and preview external judging spreadsheets or signed PDFs.
                </p>
              </div>

              {fileRecord && (
                <div className="flex items-center gap-3 text-xs font-mono">
                  <button
                    onClick={() => replaceInputRef.current?.click()}
                    className="text-[#AAA2B8] hover:text-[#C4B5FD] underline underline-offset-4 cursor-pointer"
                  >
                    Replace
                  </button>
                  <span className="text-[#352746]">/</span>
                  <button
                    onClick={handleDownloadFile}
                    className="text-[#AAA2B8] hover:text-[#F7F4FC] underline underline-offset-4 cursor-pointer"
                  >
                    Download
                  </button>
                  <span className="text-[#352746]">/</span>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-[#AAA2B8] hover:text-red-400 underline underline-offset-4 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

        {/* Loading state */}
        {isParsing && (
          <div className="p-6 bg-[#1B1230] border border-[#352746] text-center mb-6 text-xs font-mono text-[#AAA2B8]">
            Reading and structuring evaluation data...
          </div>
        )}

        {/* Error message */}
        {errorMessage && !isParsing && (
          <div className="p-4 mb-6 bg-[#1B1230] border border-[#352746] flex items-center justify-between text-xs font-mono text-red-400">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[#AAA2B8] hover:text-[#F7F4FC] ml-4 cursor-pointer underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Uploaded File Details Bar */}
        {fileRecord && !isParsing && (
          <div className="p-4 bg-[#1B1230] border border-[#352746] flex flex-wrap items-center justify-between gap-3 mb-6 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-[#F7F4FC] font-medium">{fileRecord.name}</span>
              <span className="text-[#C4B5FD] uppercase text-[10px] px-1.5 py-0.5 border border-[#352746] bg-[#120D20]">
                {fileRecord.extension}
              </span>
            </div>
            <div className="text-[#AAA2B8] text-[11px] flex items-center gap-3">
              <span>{formatFileSize(fileRecord.size)}</span>
              <span>·</span>
              <span>Persisted in browser storage</span>
            </div>
          </div>
        )}

        {/* Empty State / Upload Area */}
        {!fileRecord && !isLoading && !isParsing && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border border-dashed p-10 sm:p-14 text-center transition-colors ${
              isDragging 
                ? 'border-[#8B5CF6] bg-[#1B1230]' 
                : 'border-[#352746] bg-[#1B1230]/60 hover:border-[#8B5CF6]/50'
            }`}
          >
            <p className="text-sm font-heading font-semibold text-[#F7F4FC] uppercase tracking-wide mb-1">
              Select or Drop Evaluation Sheet
            </p>
            <p className="text-xs text-[#AAA2B8] font-mono max-w-md mx-auto mb-6">
              PDF, XLSX, XLS, or CSV files supported.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2.5 bg-[#8B5CF6] text-white hover:bg-[#7c4def] text-xs font-mono uppercase tracking-wider font-semibold transition-colors cursor-pointer"
              >
                Upload Evaluation Sheet (.xlsx / .pdf / .csv)
              </button>
            </div>
          </div>
        )}

        {/* PDF VIEWER PREVIEW */}
        {fileRecord && fileRecord.extension === 'pdf' && pdfBlobUrl && !isParsing && (
          <div className="border border-[#352746] bg-[#1B1230]">
            <div className="px-4 py-2.5 border-b border-[#352746] flex items-center justify-between text-xs font-mono text-[#AAA2B8]">
              <span>PDF DOCUMENT EMBED</span>
              <a
                href={pdfBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#C4B5FD] hover:text-[#F7F4FC] underline underline-offset-4"
              >
                Open in new tab
              </a>
            </div>
            <div className="w-full h-[600px] bg-[#120D20]">
              <object
                data={pdfBlobUrl}
                type="application/pdf"
                className="w-full h-full border-none"
              >
                <iframe
                  src={pdfBlobUrl}
                  className="w-full h-full border-none"
                  title="PDF Evaluation Document"
                />
              </object>
            </div>
          </div>
        )}

        {/* SPREADSHEET / CSV VIEWER */}
        {fileRecord && (fileRecord.extension === 'xlsx' || fileRecord.extension === 'xls' || fileRecord.extension === 'csv') && spreadsheetData && !isParsing && (
          <div className="border border-[#352746] bg-[#1B1230]">
            {/* Sheet Tabs and Search Filter */}
            <div className="p-3 border-b border-[#352746] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {spreadsheetData.sheets.map((sheet, idx) => (
                  <button
                    key={sheet.name}
                    onClick={() => {
                      setActiveSheetIndex(idx);
                      setPage(1);
                    }}
                    className={`px-3 py-1 text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                      activeSheetIndex === idx
                        ? 'bg-[#8B5CF6] text-white font-semibold'
                        : 'text-[#AAA2B8] hover:text-[#F7F4FC] hover:bg-[#120D20]'
                    }`}
                  >
                    {sheet.name} ({sheet.rows.length})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter rows..."
                  className="px-3 py-1 bg-[#120D20] border border-[#352746] text-xs text-[#F7F4FC] placeholder-[#AAA2B8] focus:outline-none focus:border-[#8B5CF6]"
                />
                <select
                  aria-label="Rows per page"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-[#120D20] border border-[#352746] text-[#AAA2B8] text-xs px-2 py-1 focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              {activeSheet && activeSheet.headers.length > 0 ? (
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="bg-[#120D20] text-[#AAA2B8] sticky top-0 z-10 border-b border-[#352746]">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center font-normal uppercase">#</th>
                      {activeSheet.headers.map((h, i) => (
                        <th key={i} className="py-2.5 px-3 font-normal uppercase tracking-wider whitespace-nowrap text-[#F7F4FC]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#352746]/60 bg-[#1B1230]">
                    {paginatedRows.length > 0 ? (
                      paginatedRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-[#120D20]/60">
                          <td className="py-2 px-3 text-center text-[#AAA2B8]">
                            {(page - 1) * pageSize + rIdx + 1}
                          </td>
                          {activeSheet.headers.map((h, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-[#F7F4FC]">
                              {row[h] !== undefined && row[h] !== null && String(row[h]).trim() !== ''
                                ? String(row[h])
                                : '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={activeSheet.headers.length + 1} className="py-8 text-center text-[#AAA2B8]">
                          No records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="py-8 text-center text-[#AAA2B8] text-xs font-mono">
                  Empty worksheet.
                </div>
              )}
            </div>

            {/* Table Pagination */}
            {activeSheet && totalPages > 1 && (
              <div className="p-3 border-t border-[#352746] flex items-center justify-between text-xs font-mono text-[#AAA2B8]">
                <span>
                  Page {page} of {totalPages} ({filteredRows.length} total rows)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 border border-[#352746] hover:bg-[#120D20] disabled:opacity-30 disabled:cursor-not-allowed text-[#F7F4FC] cursor-pointer"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 border border-[#352746] hover:bg-[#120D20] disabled:opacity-30 disabled:cursor-not-allowed text-[#F7F4FC] cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )}
    </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Remove Evaluation File?"
        message="This will delete the stored evaluation sheet from browser storage."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={handleDeleteFile}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </section>
  );
};
