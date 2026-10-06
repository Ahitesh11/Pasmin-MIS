import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileCode2,
  Copy,
  Check,
  ExternalLink,
  Sheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Play,
  Download,
  RefreshCw,
  Server
} from 'lucide-react';
import { APPS_SCRIPT_CODE } from '../../constants/appsScriptCode';
import { apiService } from '../../services/apiService';

export const AppsScriptSetupModal: React.FC = () => {
  const { settings, updateSettings, showNotification, refreshAllData } = useApp();

  const [inputUrl, setInputUrl] = useState<string>(settings.scriptUrl || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    details?: any;
  }>({ status: 'idle', message: '' });

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(APPS_SCRIPT_CODE);
      setCopied(true);
      showNotification('Google Apps Script code copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showNotification('Failed to copy. Please manually select and copy the code box below.', 'error');
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([APPS_SCRIPT_CODE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Code.gs downloaded successfully!', 'info');
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      setTestResult({
        status: 'error',
        message: 'Please enter your Google Apps Script Web App URL first.'
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ status: 'idle', message: 'Testing connection to Google Apps Script...' });

    const res = await apiService.testConnection(inputUrl.trim());
    setIsTesting(false);

    if (res.status === 'success') {
      setTestResult({
        status: 'success',
        message: res.message || 'Successfully connected to Google Sheet!',
        details: res
      });
      // Automatically save and sync
      updateSettings({ scriptUrl: inputUrl.trim(), isLiveBackend: true });
      showNotification('Google Sheet connected and active!', 'success');
      refreshAllData();
    } else {
      setTestResult({
        status: 'error',
        message: res.message || 'Failed to connect. Check Web App permissions.'
      });
    }
  };

  const handleDisconnect = () => {
    updateSettings({ scriptUrl: '', isLiveBackend: false });
    setInputUrl('');
    setTestResult({ status: 'idle', message: '' });
    showNotification('Disconnected from Google Sheet. Using built-in local database.', 'info');
    refreshAllData();
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6">
      {/* 1. Header & Live Connection Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold mb-1">
              <Sheet className="w-4 h-4" />
              <span>Google Sheets & Google Apps Script Integration</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Apps Script REST API Configuration
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Connect this React app directly to your Google Sheet using a serverless Apps Script Web App.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                settings.scriptUrl
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {settings.scriptUrl ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Connected to Live Sheet</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Google Sheet not connected</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* URL Input Box */}
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
          <label className="block text-xs font-bold text-slate-900">
            Google Apps Script Web App URL:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestConnection}
                disabled={isTesting || !inputUrl}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Test & Connect</span>
                  </>
                )}
              </button>

              {settings.scriptUrl && (
                <button
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Test Result Message */}
          {testResult.message && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : testResult.status === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {testResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.message}</p>
                {testResult.details?.sheetName && (
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Target Spreadsheet: <strong>{testResult.details.sheetName}</strong>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Step-by-Step Deployment Guide */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <span>How to Setup Your Google Sheet Backend (6 Easy Steps)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center font-mono">
              1
            </div>
            <h3 className="font-bold text-slate-900">Create Google Sheet</h3>
            <p className="text-slate-600 leading-relaxed">
              Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-sky-700 underline font-medium">sheets.new</a> to create a new spreadsheet. Name it <code className="font-semibold">HOD Daily Staff Ranking</code>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center font-mono">
              2
            </div>
            <h3 className="font-bold text-slate-900">Open Apps Script</h3>
            <p className="text-slate-600 leading-relaxed">
              In Google Sheets menu, click <strong>Extensions</strong> &rarr; <strong>Apps Script</strong>. This opens the script editor.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center font-mono">
              3
            </div>
            <h3 className="font-bold text-slate-900">Paste Script Code</h3>
            <p className="text-slate-600 leading-relaxed">
              Delete the default content in <code className="font-mono">Code.gs</code>, click <strong>Copy Script Code</strong> below, paste it, and save (<kbd className="font-mono">Ctrl+S</kbd>).
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center font-mono">
              4
            </div>
            <h3 className="font-bold text-slate-900">Run Sheet Setup</h3>
            <p className="text-slate-600 leading-relaxed">
              In the toolbar, select function <code className="font-mono font-semibold">initializeSpreadsheet</code> and click <strong>Run</strong>. This creates the <code className="font-semibold">Staff</code> and <code className="font-semibold">Records</code> sheets with exact columns!
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center font-mono">
              5
            </div>
            <h3 className="font-bold text-slate-900">Deploy as Web App</h3>
            <p className="text-slate-600 leading-relaxed">
              Click <strong>Deploy &rarr; New deployment</strong>. Select <strong>Web app</strong>. Set <em>Execute as:</em> <strong>Me</strong> and <em>Who has access:</em> <strong>Anyone</strong>.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center font-mono">
              6
            </div>
            <h3 className="font-bold text-slate-900">Paste & Test URL</h3>
            <p className="text-slate-600 leading-relaxed">
              Copy your Web App URL, paste it into the URL box above, and click <strong>Test & Connect</strong>. Your system is live!
            </p>
          </div>
        </div>
      </div>

      {/* 3. Full Production Apps Script Code Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-sky-700" />
              <span>Production Google Apps Script Code (Code.gs)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Includes HOD security validation, Day 1-7 calculation, and Records duplication protection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCode}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Code.gs</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Script Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="relative">
          <pre className="p-4 text-xs font-mono text-slate-800 bg-slate-950 text-slate-100 overflow-x-auto max-h-[500px] leading-relaxed">
            {APPS_SCRIPT_CODE}
          </pre>
        </div>
      </div>
    </div>
  );
};
