import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '../api/api';
import {
    RefreshCw, Copy, ChevronDown, ChevronRight,
    Code2, ChevronsDownUp, ChevronsUpDown,
    CheckCircle, AlertCircle, Clock, Layers, MessageSquare,
    FileText, BarChart2, Loader2
} from 'lucide-react';

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    });
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, badge, children, copyData, loading }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        copyToClipboard(typeof copyData === 'string' ? copyData : JSON.stringify(copyData, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="bg-white rounded-xl shadow-sm border mb-6">
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <Icon size={18} className="text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
                    {loading && <Loader2 size={15} className="animate-spin text-blue-400" />}
                    {badge !== undefined && !loading && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{badge}</span>
                    )}
                </div>
                {copyData !== undefined && !loading && (
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                    >
                        <Copy size={13} />
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                )}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

// ─── Empty / Waiting State ────────────────────────────────────────────────────
function EmptyState({ message, waiting }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            {waiting
                ? <Loader2 size={28} className="mb-3 animate-spin text-blue-300" />
                : <AlertCircle size={28} className="mb-3 text-gray-300" />
            }
            <p className="text-sm">{message}</p>
        </div>
    );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ label, value, highlight }) {
    return (
        <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className={`text-xl font-bold ${highlight ? 'text-blue-700' : 'text-gray-800'}`}>{value ?? '—'}</span>
            <span className="text-xs text-gray-500 mt-0.5">{label}</span>
        </div>
    );
}

// ─── Stage Progress Bar ───────────────────────────────────────────────────────
function StageProgress({ status }) {
    const stages = [
        { key: 'has_raw', label: 'Upload', color: 'bg-blue-500' },
        { key: 'has_cleaned', label: 'Cleaning', color: 'bg-purple-500' },
        { key: 'has_chunks', label: 'Chunking', color: 'bg-orange-500' },
        { key: 'has_qa', label: 'QA Pairs', color: 'bg-green-500' },
    ];
    return (
        <div className="flex items-center gap-1 mb-5">
            {stages.map((s, i) => {
                const done = !!status?.[s.key];
                const isLast = i === stages.length - 1;
                return (
                    <React.Fragment key={s.key}>
                        <div className="flex flex-col items-center gap-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all ${done ? s.color : 'bg-gray-200'}`}>
                                {done ? <CheckCircle size={16} /> : <span>{i + 1}</span>}
                            </div>
                            <span className={`text-xs font-medium ${done ? 'text-gray-700' : 'text-gray-400'}`}>{s.label}</span>
                        </div>
                        {!isLast && (
                            <div className={`flex-1 h-1 rounded mb-4 transition-all ${done ? s.color : 'bg-gray-200'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ─── Pipeline Metadata ────────────────────────────────────────────────────────
function MetadataSection({ status, projectName }) {
    const hasAny = status?.has_raw || status?.has_cleaned || status?.has_chunks || status?.has_qa;

    const overallStatus = status?.has_qa ? 'Completed'
        : status?.has_raw ? 'In Progress'
            : 'Not Started';

    const currentStage = status?.has_qa ? 'QA Generation'
        : status?.has_chunks ? 'Chunking'
            : status?.has_cleaned ? 'Cleaning'
                : status?.has_raw ? 'Upload'
                    : null;

    const statusColor = overallStatus === 'Completed'
        ? 'text-green-600 bg-green-50 border-green-200'
        : overallStatus === 'In Progress'
            ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
            : 'text-gray-500 bg-gray-50 border-gray-200';

    if (!hasAny) {
        return (
            <Section title="Pipeline Metadata" icon={BarChart2}>
                <EmptyState message="Pipeline not executed yet." />
            </Section>
        );
    }

    return (
        <Section title="Pipeline Metadata" icon={BarChart2} copyData={JSON.stringify(status, null, 2)}>
            <StageProgress status={status} />

            <div className="flex flex-wrap gap-3 mb-5">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusColor}`}>
                    {overallStatus === 'Completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {overallStatus}
                </div>
                {currentStage && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium bg-purple-50 border-purple-200 text-purple-700">
                        <Layers size={14} />
                        Stage: {currentStage}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatPill label="Raw Text" value={status?.has_raw ? '✓' : '✗'} />
                <StatPill label="Cleaned" value={status?.has_cleaned ? '✓' : '✗'} />
                <StatPill label="Chunks" value={status?.chunk_count ?? 0} highlight={!!status?.has_chunks} />
                <StatPill label="QA Pairs" value={status?.qa_count ?? 0} highlight={!!status?.has_qa} />
            </div>
        </Section>
    );
}

// ─── Cleaning Preview ─────────────────────────────────────────────────────────
function CleaningSection({ projectName, hasCleaned }) {
    const [showRaw, setShowRaw] = useState(false);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['cleaned', projectName],
        queryFn: () => projectApi.getCleanedText(projectName),
        enabled: !!hasCleaned,
        staleTime: 30_000,
    });

    const isWaiting = !hasCleaned;
    const loading = isLoading && hasCleaned;

    if (isWaiting) {
        return (
            <Section title="Cleaning Preview" icon={FileText}>
                <EmptyState waiting message="Waiting for cleaning stage to complete..." />
            </Section>
        );
    }

    if (loading) {
        return (
            <Section title="Cleaning Preview" icon={FileText} loading>
                <EmptyState waiting message="Loading cleaned text..." />
            </Section>
        );
    }

    if (!data) {
        return (
            <Section title="Cleaning Preview" icon={FileText}>
                <EmptyState message="No cleaned text available." />
            </Section>
        );
    }

    const { cleaned_text, cleaned_length, raw_length } = data;
    const preview = cleaned_text.slice(0, 1000);
    const diff = raw_length && cleaned_length ? raw_length - cleaned_length : null;

    return (
        <Section
            title="Cleaning Preview"
            icon={FileText}
            badge={`${cleaned_length?.toLocaleString()} chars`}
            copyData={cleaned_text}
            loading={isFetching && !isLoading}
        >
            <div className="grid grid-cols-3 gap-3 mb-5">
                <StatPill label="Raw Length" value={raw_length?.toLocaleString() ?? '—'} />
                <StatPill label="Cleaned Length" value={cleaned_length?.toLocaleString() ?? '—'} highlight />
                <StatPill label="Chars Removed" value={diff !== null ? diff.toLocaleString() : '—'} />
            </div>

            <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    First {Math.min(preview.length, 1000)} characters
                </span>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
                >
                    <Code2 size={12} />
                    {showRaw ? 'Text View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                    {JSON.stringify(data, null, 2)}
                </pre>
            ) : (
                <textarea
                    readOnly
                    value={preview + (cleaned_text.length > 1000 ? '\n\n... (truncated)' : '')}
                    className="w-full h-48 p-4 bg-gray-50 border rounded-lg text-sm font-mono resize-none text-gray-700 focus:outline-none"
                    style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
                />
            )}
        </Section>
    );
}

// ─── Chunking Preview ─────────────────────────────────────────────────────────
function ChunkingSection({ projectName, hasChunks }) {
    const [expandedChunks, setExpandedChunks] = useState({});
    const [showRaw, setShowRaw] = useState(false);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['chunks', projectName],
        queryFn: () => projectApi.getChunks(projectName),
        enabled: !!hasChunks,
        staleTime: 30_000,
    });

    const isWaiting = !hasChunks;
    const loading = isLoading && hasChunks;

    if (isWaiting) {
        return (
            <Section title="Chunking Preview" icon={Layers}>
                <EmptyState waiting message="Waiting for chunking stage to complete..." />
            </Section>
        );
    }

    if (loading) {
        return (
            <Section title="Chunking Preview" icon={Layers} loading>
                <EmptyState waiting message="Loading chunks..." />
            </Section>
        );
    }

    const chunks = data?.chunks ?? [];
    if (chunks.length === 0) {
        return (
            <Section title="Chunking Preview" icon={Layers}>
                <EmptyState message="No chunks available." />
            </Section>
        );
    }

    const first5 = chunks.slice(0, 5);
    const sizes = chunks.map(c => (typeof c === 'string' ? c.length : c.text?.length ?? JSON.stringify(c).length));
    const avgSize = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);

    const allExpanded = first5.every((_, i) => expandedChunks[i]);
    const toggleAll = () => {
        const next = {};
        first5.forEach((_, i) => { next[i] = !allExpanded; });
        setExpandedChunks(next);
    };
    const toggleChunk = (i) => setExpandedChunks(prev => ({ ...prev, [i]: !prev[i] }));

    return (
        <Section
            title="Chunking Preview"
            icon={Layers}
            badge={`${chunks.length} chunks`}
            copyData={chunks.slice(0, 5)}
            loading={isFetching && !isLoading}
        >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <StatPill label="Total Chunks" value={chunks.length} highlight />
                <StatPill label="Avg Size" value={`${avgSize} ch`} />
                <StatPill label="Min Size" value={`${minSize} ch`} />
                <StatPill label="Max Size" value={`${maxSize} ch`} />
            </div>

            <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                    First {first5.length} of {chunks.length} chunks
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={toggleAll}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
                    >
                        {allExpanded ? <ChevronsDownUp size={12} /> : <ChevronsUpDown size={12} />}
                        {allExpanded ? 'Collapse All' : 'Expand All'}
                    </button>
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
                    >
                        <Code2 size={12} />
                        {showRaw ? 'List View' : 'Raw JSON'}
                    </button>
                </div>
            </div>

            {showRaw ? (
                <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-72 font-mono whitespace-pre-wrap">
                    {JSON.stringify(first5, null, 2)}
                </pre>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {first5.map((chunk, i) => {
                        const text = typeof chunk === 'string' ? chunk : chunk.text ?? JSON.stringify(chunk);
                        const size = text.length;
                        const isOpen = !!expandedChunks[i];
                        return (
                            <div key={i} className="border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleChunk(i)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        {isOpen ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
                                        <span className="text-sm font-medium text-gray-700">Chunk {i + 1}</span>
                                    </div>
                                    <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                                        {size} chars
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-4 py-3 bg-white border-t">
                                        <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{text}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Section>
    );
}

// ─── QA Pairs Preview ─────────────────────────────────────────────────────────
function QAPairsSection({ projectName, hasQA }) {
    const [showRaw, setShowRaw] = useState(false);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['qa', projectName],
        queryFn: () => projectApi.getQAPairs(projectName),
        enabled: !!hasQA,
        staleTime: 30_000,
    });

    const isWaiting = !hasQA;
    const loading = isLoading && hasQA;

    if (isWaiting) {
        return (
            <Section title="QA Pairs Preview" icon={MessageSquare}>
                <EmptyState waiting message="Waiting for QA generation to complete..." />
            </Section>
        );
    }

    if (loading) {
        return (
            <Section title="QA Pairs Preview" icon={MessageSquare} loading>
                <EmptyState waiting message="Loading QA pairs..." />
            </Section>
        );
    }

    const pairs = data?.qa_pairs ?? [];
    if (pairs.length === 0) {
        return (
            <Section title="QA Pairs Preview" icon={MessageSquare}>
                <EmptyState message="No QA pairs generated yet." />
            </Section>
        );
    }

    const first10 = pairs.slice(0, 10);

    return (
        <Section
            title="QA Pairs Preview"
            icon={MessageSquare}
            badge={`${pairs.length} pairs`}
            copyData={first10}
            loading={isFetching && !isLoading}
        >
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">Showing first {first10.length} of {pairs.length} pairs</p>
                <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
                >
                    <Code2 size={12} />
                    {showRaw ? 'Card View' : 'Raw JSON'}
                </button>
            </div>

            {showRaw ? (
                <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-auto max-h-96 font-mono whitespace-pre-wrap">
                    {JSON.stringify(first10, null, 2)}
                </pre>
            ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {first10.map((pair, i) => {
                        const q = pair.instruction ?? pair.question ?? pair.input ?? `Pair ${i + 1}`;
                        const a = pair.output ?? pair.answer ?? pair.response ?? '';
                        return (
                            <div key={i}>
                                <div className="bg-gray-50 rounded-xl p-4 border">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1">Q{i + 1}</p>
                                    <p className="font-semibold text-gray-800 text-sm mb-3">{q}</p>
                                    <p className="text-xs font-bold text-green-600 uppercase tracking-wide mb-1">Answer</p>
                                    <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
                                </div>
                                {i < first10.length - 1 && <div className="border-b my-1" />}
                            </div>
                        );
                    })}
                </div>
            )}
        </Section>
    );
}

// ─── Main Debug Dashboard ─────────────────────────────────────────────────────
export default function DebugDashboard({ projectName, status }) {
    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Debug Dashboard</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Live pipeline inspection — updates automatically as each stage completes
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border px-3 py-1.5 rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Auto-refreshing every 2s
                </div>
            </div>

            <MetadataSection status={status} projectName={projectName} />
            <CleaningSection projectName={projectName} hasCleaned={status?.has_cleaned} />
            <ChunkingSection projectName={projectName} hasChunks={status?.has_chunks} />
            <QAPairsSection projectName={projectName} hasQA={status?.has_qa} />
        </div>
    );
}
