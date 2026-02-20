import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/api';
import {
    ArrowLeft, Play, Upload, Settings, FileText, Download,
    CheckCircle, AlertCircle, Loader2, BarChart2, Square, Zap
} from 'lucide-react';
import SettingsPanel from '../components/SettingsPanel';
import DebugDashboard from '../components/DebugDashboard';
import PromptEditor from '../components/PromptEditor';

export default function Workspace() {
    const { name } = useParams();
    const [activeTab, setActiveTab] = useState('upload');
    const [pipelineConfig, setPipelineConfig] = useState({
        chunk_size: 800,
        chunk_overlap: 100,
        similarity_threshold: 0.92,
    });
    const [generationConfig, setGenerationConfig] = useState({
        provider: 'local',
        model_name: 'llama3.2',
        temperature: 0.7,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        max_tokens: 0,
        qa_density_factor: 1.0,
        domain: 'general',
        format: 'alpaca',
        api_key: '',
    });
    const [uploadFile, setUploadFile] = useState(null);
    const queryClient = useQueryClient();

    const { data: status } = useQuery({
        queryKey: ['status', name],
        queryFn: () => projectApi.getStatus(name),
        refetchInterval: 2000,
    });

    const uploadMutation = useMutation({
        mutationFn: (file) => projectApi.upload(name, file),
        onSuccess: () => {
            queryClient.invalidateQueries(['status', name]);
            setActiveTab('settings');
        },
        onError: (e) => alert(`Upload failed: ${e.message}`),
    });

    const runPipelineMutation = useMutation({
        mutationFn: () => projectApi.runPipeline(name, {
            pipeline_config: pipelineConfig,
            generation_config: generationConfig,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries(['qa', name]);
            queryClient.invalidateQueries(['status', name]);
        },
        onError: (e) => alert(`Failed to start pipeline: ${e.message}`),
    });

    const stopMutation = useMutation({
        mutationFn: () => projectApi.stopPipeline(name),
        onSuccess: () => { queryClient.invalidateQueries(['status', name]); },
        onError: (e) => alert(`Failed to stop pipeline: ${e.message}`),
    });

    const tabs = [
        { id: 'upload', label: 'Upload', icon: Upload },
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'prompt', label: 'Prompt', icon: FileText },
        { id: 'run', label: 'Run Pipeline', icon: Play },
        { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
        { id: 'export', label: 'Export', icon: Download },
    ];

    return (
        <div className="max-w-6xl mx-auto">

            {/* ── Workspace Header ──────────────────────────────────────── */}
            <div className="mb-6 flex items-center justify-between">
                <Link
                    to="/"
                    className="neu-btn flex items-center gap-2 px-4 py-2 text-sm text-neu-dim hover:text-neu-text rounded-xl no-underline"
                >
                    <ArrowLeft size={16} />
                    Back
                </Link>

                <div className="neu-inset px-4 py-2 rounded-xl">
                    <span className="font-mono text-xs text-neu-accent tracking-widest font-bold uppercase">{name}</span>
                </div>
            </div>

            {/* ── Status Bar ───────────────────────────────────────────── */}
            <div className="neu-trough px-5 py-3.5 flex items-center justify-between mb-6 rounded-2xl">
                <div className="flex gap-5">
                    <StatusItem label="Raw" active={status?.has_raw} />
                    <StatusItem label="Cleaned" active={status?.has_cleaned} />
                    <StatusItem label="Chunks" active={status?.has_chunks} count={status?.chunk_count} />
                    <StatusItem label="QA" active={status?.has_qa || status?.stopped} count={status?.qa_count} />
                </div>

                <div className="flex items-center gap-3">
                    {status?.running && (
                        <>
                            <div className="flex items-center gap-2 neu-inset px-4 py-1.5 rounded-xl">
                                <Loader2 size={12} className="animate-spin text-neu-accent" />
                                <span className="text-xs font-bold text-neu-accent tracking-widest uppercase">Running</span>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm('Stop after current chunk? Partial results will be saved.')) {
                                        stopMutation.mutate();
                                    }
                                }}
                                disabled={stopMutation.isPending}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-red-400 neu-inset hover:shadow-[inset_5px_5px_10px_#141619,inset_-5px_-5px_10px_#2e343b,0_0_10px_rgba(239,68,68,0.3)] transition-all disabled:opacity-40"
                            >
                                {stopMutation.isPending
                                    ? <Loader2 size={11} className="animate-spin" />
                                    : <Square size={10} fill="currentColor" />
                                }
                                {stopMutation.isPending ? 'Stopping…' : 'Stop'}
                            </button>
                        </>
                    )}
                    {!status?.running && status?.stopped && (
                        <div className="flex items-center gap-2 neu-inset px-4 py-1.5 rounded-xl">
                            <div className="led led-on" />
                            <span className="text-xs font-bold text-neu-accent tracking-widest uppercase">Stopped</span>
                        </div>
                    )}
                    {!status?.running && status?.has_error && (
                        <div className="flex items-center gap-2 neu-inset px-4 py-1.5 rounded-xl">
                            <div className="led led-red" />
                            <span className="text-xs font-bold text-red-400 tracking-widest uppercase">Error</span>
                        </div>
                    )}
                    {status?.finished && !status?.running && (
                        <div className="flex items-center gap-2 neu-inset px-4 py-1.5 rounded-xl">
                            <div className="led led-green" />
                            <span className="text-xs font-bold text-green-400 tracking-widest uppercase">Complete</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-6">
                {/* ── Sidebar ────────────────────────────────────────── */}
                <div className="w-52 flex-shrink-0 flex flex-col gap-3">
                    {tabs.map((tab, idx) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative group flex items-center gap-4 px-5 py-4 rounded-2xl text-left outline-none transition-all duration-300 ${isActive
                                    ? 'neu-inset text-neu-accent'
                                    : 'neu-plate text-neu-dim hover:text-neu-text'
                                    }`}
                            >
                                {/* Active top stripe */}
                                {isActive && (
                                    <div className="absolute top-0 left-4 right-4 h-[2px] bg-neu-accent rounded-full shadow-[0_0_8px_rgba(255,107,0,0.6)]" />
                                )}

                                {/* Icon */}
                                <div className={`flex-shrink-0 p-2.5 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-neu-accent/10 shadow-[0_0_12px_rgba(255,107,0,0.25)]'
                                    : 'bg-neu-base shadow-[3px_3px_6px_#141619,-3px_-3px_6px_#2e343b]'
                                    }`}>
                                    <tab.icon
                                        size={16}
                                        strokeWidth={isActive ? 2.5 : 1.5}
                                        className={isActive ? 'text-neu-accent' : 'text-neu-dim'}
                                    />
                                </div>

                                {/* Label */}
                                <div className="flex-1 min-w-0">
                                    <span className={`text-sm font-semibold block truncate ${isActive ? 'text-neu-accent' : 'text-neu-dim'}`}>
                                        {tab.label}
                                    </span>
                                </div>

                                {/* LED */}
                                <div className={`led flex-shrink-0 transition-all duration-300 ${isActive ? 'led-on' : 'led-off'}`} />
                            </button>
                        );
                    })}
                </div>

                {/* ── Content Panel ─────────────────────────────────── */}
                <div className="flex-1 min-w-0 neu-plate p-8 min-h-[540px]">

                    {/* ▸ UPLOAD */}
                    {activeTab === 'upload' && (
                        <div className="flex flex-col items-center justify-center min-h-[420px] gap-8">
                            {/* Drop zone */}
                            <label className="w-full max-w-md cursor-pointer">
                                <div className={`neu-trough rounded-2xl p-12 flex flex-col items-center gap-4 border-2 border-dashed transition-all duration-300 ${uploadFile
                                    ? 'border-neu-accent/40 shadow-[inset_4px_4px_8px_#111315,inset_-4px_-4px_8px_#2c323a,0_0_20px_rgba(255,107,0,0.1)]'
                                    : 'border-white/5 hover:border-neu-dim/20'
                                    }`}>
                                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${uploadFile ? 'bg-neu-accent/10 shadow-[0_0_20px_rgba(255,107,0,0.3)]' : 'neu-plate'
                                        }`}>
                                        <Upload size={32} className={uploadFile ? 'text-neu-accent' : 'text-neu-dim'} strokeWidth={1.5} />
                                    </div>

                                    {uploadFile ? (
                                        <>
                                            <p className="font-bold text-neu-text tracking-tight">{uploadFile.name}</p>
                                            <p className="text-[10px] font-mono text-neu-dim uppercase tracking-widest">
                                                {(uploadFile.size / 1024).toFixed(1)} KB · Ready
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="font-semibold text-neu-text">Select source text</p>
                                            <p className="text-[10px] font-mono text-neu-dim uppercase tracking-widest">TXT files only</p>
                                        </>
                                    )}

                                    <input
                                        type="file" accept=".txt"
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        className="sr-only"
                                    />
                                </div>
                            </label>

                            {/* Upload CTA */}
                            <button
                                onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
                                disabled={!uploadFile || uploadMutation.isPending}
                                className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold tracking-widest text-sm uppercase transition-all duration-300 ${uploadFile && !uploadMutation.isPending
                                    ? 'neu-btn neu-btn-primary shadow-[var(--sh-flat),var(--glow-sm)] hover:shadow-[var(--sh-hover),var(--glow)]'
                                    : 'neu-inset text-neu-dim/30 cursor-not-allowed'
                                    }`}
                            >
                                {uploadMutation.isPending
                                    ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
                                    : <><Zap size={16} /> Ingest File</>
                                }
                            </button>

                            {status?.has_raw && (
                                <div className="flex items-center gap-3 neu-inset px-5 py-3 rounded-xl">
                                    <div className="led led-green" />
                                    <span className="text-xs font-bold text-green-400 tracking-widest uppercase">File Uploaded</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ▸ SETTINGS */}
                    {activeTab === 'settings' && (
                        <SettingsPanel
                            pipelineConfig={pipelineConfig}
                            setPipelineConfig={setPipelineConfig}
                            generationConfig={generationConfig}
                            setGenerationConfig={setGenerationConfig}
                        />
                    )}

                    {/* ▸ PROMPT */}
                    {activeTab === 'prompt' && <PromptEditor />}

                    {/* ▸ RUN */}
                    {activeTab === 'run' && (
                        <div className="flex flex-col items-center justify-center min-h-[420px] gap-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-light text-neu-text tracking-tight">
                                    Run Pipeline
                                </h2>
                                <p className="text-[10px] font-mono text-neu-dim uppercase tracking-widest mt-1">
                                    Clean → Chunk → Embed → Generate
                                </p>
                            </div>

                            {/* Running banner */}
                            {status?.running && (
                                <div className="neu-alert-info w-full max-w-md animate-in fade-in">
                                    <Loader2 size={16} className="animate-spin flex-shrink-0 text-blue-400" />
                                    <div>
                                        <p className="font-bold text-xs uppercase tracking-wide">Pipeline Active</p>
                                        <p className="text-[10px] font-mono opacity-70">Monitor live progress in the Inspector tab.</p>
                                    </div>
                                </div>
                            )}

                            {/* Stopped banner */}
                            {status?.stopped && !status?.running && (
                                <div className="neu-alert-warn w-full max-w-md animate-in fade-in">
                                    <AlertCircle size={16} className="flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-xs uppercase tracking-wide">Generation Stopped</p>
                                        <p className="text-[10px] font-mono opacity-70">Partial results are viewable in Inspector.</p>
                                    </div>
                                </div>
                            )}

                            {/* Config manifest */}
                            <div className="neu-trough w-full max-w-md p-5 rounded-2xl">
                                <p className="text-[10px] font-bold text-neu-dim uppercase tracking-widest mb-4">Runtime Manifest</p>
                                <div className="space-y-3">
                                    {[
                                        ['Chunk Size', pipelineConfig.chunk_size],
                                        ['Provider', generationConfig.provider === 'openai' ? 'OpenAI API' : 'Ollama (Local)'],
                                        ['Model', generationConfig.model_name],
                                        ['Format', generationConfig.format],
                                    ].map(([key, val]) => (
                                        <div key={key} className="flex items-center justify-between gap-4">
                                            <span className="text-xs text-neu-dim font-mono">{key}</span>
                                            <span className="neu-badge neu-badge-accent font-mono">{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Engage + Stop */}
                            <div className="flex flex-col items-center gap-4">
                                <button
                                    onClick={() => runPipelineMutation.mutate()}
                                    disabled={runPipelineMutation.isPending || status?.running || !status?.has_raw}
                                    className={`flex items-center gap-4 px-12 py-5 rounded-2xl text-base font-bold tracking-widest uppercase transition-all duration-300 ${status?.running || runPipelineMutation.isPending || !status?.has_raw
                                        ? 'neu-inset text-neu-dim/30 cursor-not-allowed'
                                        : 'neu-btn neu-btn-primary shadow-[var(--sh-flat),var(--glow-sm)] hover:shadow-[var(--sh-hover),var(--glow)] active:shadow-[var(--sh-press)]'
                                        }`}
                                >
                                    {status?.running || runPipelineMutation.isPending
                                        ? <Loader2 size={20} className="animate-spin" />
                                        : <Play size={20} fill="currentColor" />
                                    }
                                    {status?.running ? 'Processing…' : 'Engage'}
                                </button>

                                {!status?.has_raw && (
                                    <p className="text-[10px] font-mono text-neu-dim uppercase tracking-wide">
                                        Upload a source file first
                                    </p>
                                )}

                                {status?.running && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Stop after current chunk? Partial results will be saved.')) {
                                                stopMutation.mutate();
                                            }
                                        }}
                                        disabled={stopMutation.isPending}
                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-red-400 neu-inset tracking-widest uppercase hover:shadow-[inset_5px_5px_10px_#141619,inset_-5px_-5px_10px_#2e343b,0_0_12px_rgba(239,68,68,0.25)] transition-all disabled:opacity-40"
                                    >
                                        {stopMutation.isPending
                                            ? <Loader2 size={12} className="animate-spin" />
                                            : <Square size={11} fill="currentColor" />
                                        }
                                        Stop
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ▸ DASHBOARD */}
                    {activeTab === 'dashboard' && (
                        <DebugDashboard projectName={name} status={status} />
                    )}

                    {/* ▸ EXPORT */}
                    {activeTab === 'export' && (
                        <div className="flex flex-col items-center justify-center min-h-[420px] gap-8">
                            <div className="text-center">
                                <h2 className="text-2xl font-light text-neu-text tracking-tight">
                                    Export Dataset
                                </h2>
                                <p className="text-[10px] font-mono text-neu-dim uppercase tracking-widest mt-1">
                                    Download your generated QA pairs
                                </p>
                            </div>

                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center neu-plate">
                                <Download
                                    size={32}
                                    strokeWidth={1.5}
                                    className={status?.has_qa ? 'text-neu-accent' : 'text-neu-dim/30'}
                                />
                            </div>

                            <button
                                onClick={async () => {
                                    const response = await projectApi.export(name, 'alpaca');
                                    const url = window.URL.createObjectURL(response.data);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `${name}_alpaca.jsonl`);
                                    document.body.appendChild(link);
                                    link.click();
                                }}
                                disabled={!status?.has_qa}
                                className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold tracking-widest text-sm uppercase transition-all duration-300 ${status?.has_qa
                                    ? 'neu-btn neu-btn-primary shadow-[var(--sh-flat),var(--glow-sm)] hover:shadow-[var(--sh-hover),var(--glow)]'
                                    : 'neu-inset text-neu-dim/30 cursor-not-allowed'
                                    }`}
                            >
                                <Download size={16} />
                                Download JSONL
                            </button>

                            {!status?.has_qa && (
                                <p className="text-[10px] font-mono text-neu-dim uppercase tracking-widest">
                                    Run pipeline to generate QA pairs first
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Status Indicator ─────────────────────────────────────────────────────────
function StatusItem({ label, active, count }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`led ${active ? 'led-green animate-pulse' : 'led-off'}`} />
            <span className={`text-[10px] font-bold tracking-widest uppercase ${active ? 'text-green-400' : 'text-neu-dim/40'}`}>
                {label}
            </span>
            {count !== undefined && active && (
                <span className="neu-badge neu-badge-green text-[9px]">{count}</span>
            )}
        </div>
    );
}
