import { useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader, Copy, Check } from 'lucide-react';
import type { NodeExecutionResult } from '../../types';

interface Props {
  result: NodeExecutionResult;
}

function buildCurl(req: NodeExecutionResult['request']): string {
  if (!req) return '';
  const parts: string[] = [`curl -X ${req.method}`];
  for (const [k, v] of Object.entries(req.headers || {})) {
    parts.push(`  -H '${k}: ${v}'`);
  }
  if (req.body != null) {
    const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body, null, 2);
    parts.push(`  -d '${bodyStr}'`);
  }
  parts.push(`  '${req.url}'`);
  return parts.join(' \\\n');
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

function Section({ title, open, onToggle, children }: {
  title: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-gray-200 mb-1"
      >
        <span className="font-medium">{title}</span>
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </button>
      {open && children}
    </div>
  );
}

export default function ResultPanel({ result }: Props) {
  const [curlOpen, setCurlOpen] = useState(true);
  const [responseOpen, setResponseOpen] = useState(true);

  const statusIcon = {
    idle: null,
    running: <Loader size={14} className="animate-spin text-blue-400" />,
    success: <CheckCircle size={14} className="text-green-400" />,
    error: <XCircle size={14} className="text-red-400" />,
    skipped: <Clock size={14} className="text-gray-400" />,
  }[result.status];

  const duration =
    result.startedAt && result.finishedAt
      ? `${result.finishedAt - result.startedAt}ms`
      : null;

  const curlStr = buildCurl(result.request);

  return (
    <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="text-xs font-semibold text-gray-300">실행 결과</span>
        </div>
        {duration && <span className="text-xs text-gray-500">{duration}</span>}
      </div>

      {/* 에러 메시지 */}
      {result.error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
          <p className="text-xs text-red-400 font-mono whitespace-pre-wrap">{result.error}</p>
        </div>
      )}

      {/* curl */}
      {curlStr && (
        <Section title="curl" open={curlOpen} onToggle={() => setCurlOpen((v) => !v)}>
          <div className="relative">
            <pre className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-xs text-green-300 font-mono overflow-auto max-h-52 whitespace-pre-wrap break-all">
              {curlStr}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyButton text={curlStr} />
            </div>
          </div>
        </Section>
      )}

      {/* Response */}
      {result.response && (
        <Section
          title={
            <span
              className={`px-2 py-0.5 rounded font-bold ${
                result.response.status < 300
                  ? 'bg-green-900/40 text-green-400'
                  : result.response.status < 500
                  ? 'bg-yellow-900/40 text-yellow-400'
                  : 'bg-red-900/40 text-red-400'
              }`}
            >
              {result.response.status} {result.response.statusText}
            </span>
          }
          open={responseOpen}
          onToggle={() => setResponseOpen((v) => !v)}
        >
          <div className="space-y-2">
            {/* Assertions */}
            {result.assertionResults && result.assertionResults.length > 0 && (
              <div
                className={`rounded-lg p-2 border ${
                  result.assertionResults.every((r) => r.passed)
                    ? 'bg-green-900/20 border-green-800/50'
                    : 'bg-red-900/20 border-red-800/50'
                }`}
              >
                <p className="text-xs font-semibold mb-1.5 text-gray-300">Assertions</p>
                <div className="space-y-1">
                  {result.assertionResults.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs font-mono">
                      <span className={r.passed ? 'text-green-400' : 'text-red-400'}>
                        {r.passed ? '✓' : '✗'}
                      </span>
                      <span className={r.passed ? 'text-gray-400' : 'text-red-300'}>
                        {r.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 추출된 변수 */}
            {result.extractedVars && Object.keys(result.extractedVars).length > 0 && (
              <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-2">
                <p className="text-xs text-purple-400 font-semibold mb-1">추출된 변수</p>
                {Object.entries(result.extractedVars).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="text-orange-400">{k}</span>
                    <span className="text-gray-500">=</span>
                    <span className="text-gray-300 font-mono truncate">
                      {typeof v === 'string' ? v : JSON.stringify(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Response Body */}
            <div className="relative">
              <pre className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-auto max-h-48">
                {JSON.stringify(result.response.data, null, 2)}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyButton text={JSON.stringify(result.response.data, null, 2)} />
              </div>
            </div>
          </div>
        </Section>
      )}

    </div>
  );
}
