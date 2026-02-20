import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { llmApi } from '../api/api';
import { Cpu, Globe, RefreshCw, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';

const OPENAI_MODELS = [
    { id: 'gpt-4o', label: 'Recommended' },
    { id: 'gpt-4o-mini', label: 'Fast · Cheap' },
    { id: 'gpt-4-turbo', label: 'Turbo' },
    { id: 'gpt-3.5-turbo', label: 'Economy' },
];

// ─── Slider ───────────────────────────────────────────────────────────────────
function Slider({ label, min, max, step, value, onChange }) {
    const pct = ((value - min) / (max - min)) * 100;
    return (
        <div>
            <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-neu-dim tracking-widest uppercase">{label}</label>
                <span className="text-xs font-mono text-neu-accent bg-neu-accent/10 px-2 py-0.5 rounded border border-neu-accent/20">{value}</span>
            </div>
            <div className="relative h-8 flex items-center">
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                    className="w-full appearance-none bg-transparent z-20 cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 
                    [&::-webkit-slider-thumb]:rounded-full 
                    [&::-webkit-slider-thumb]:bg-neu-base 
                    [&::-webkit-slider-thumb]:shadow-[5px_5px_10px_#141619,-5px_-5px_10px_#2e343b] 
                    [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-white/[0.05]
                    [&::-webkit-slider-thumb]:mt-[-5px]"
                />
                <div className="absolute top-1/2 left-0 w-full h-3 neu-trough rounded-full -translate-y-1/2 z-10 pointer-events-none" />
                <div
                    className="absolute top-1/2 left-0 h-[6px] rounded-full bg-neu-accent/80 -translate-y-1/2 z-10 pointer-events-none shadow-[0_0_8px_rgba(255,107,0,0.5)] transition-all duration-100"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── Provider Button ──────────────────────────────────────────────────────────
function ProviderBtn({ active, onClick, icon: Icon, label, sublabel }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-3 py-5 px-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${active ? 'neu-inset' : 'neu-plate hover:-translate-y-1'
                }`}
        >
            {active && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-neu-accent shadow-[0_0_12px_rgba(255,107,0,0.6)]" />
            )}
            <div className={`p-3 rounded-xl transition-all ${active
                    ? 'bg-neu-accent/10 text-neu-accent shadow-[0_0_10px_rgba(255,107,0,0.3)]'
                    : 'text-neu-dim bg-neu-base shadow-[3px_3px_6px_#141619,-3px_-3px_6px_#2e343b]'
                }`}>
                <Icon size={22} strokeWidth={1.5} />
            </div>
            <div>
                <p className={`text-sm font-bold tracking-wide text-center ${active ? 'text-neu-accent' : 'text-neu-text'}`}>{label}</p>
                <p className="text-[10px] font-mono text-neu-dim text-center mt-0.5">{sublabel}</p>
            </div>
        </button>
    );
}

// ─── Local (Ollama) Section ───────────────────────────────────────────────────
function LocalSection({ generationConfig, setGenerationConfig }) {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['ollama-models'],
        queryFn: llmApi.getOllamaModels,
        staleTime: 30_000,
        retry: false,
    });

    const models = data?.models ?? [];
    const ollamaUp = data?.available ?? false;

    useEffect(() => {
        if (models.length > 0 && !models.includes(generationConfig.model_name)) {
            setGenerationConfig(prev => ({ ...prev, model_name: models[0], provider: 'local' }));
        }
    }, [models]);

    return (
        <div className="space-y-5">
            {/* Status */}
            <div className={`neu-trough flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold tracking-wide uppercase`}>
                <div className="flex items-center gap-3">
                    <div className={`led ${ollamaUp ? 'led-green animate-pulse' : 'led-red'} ${isLoading ? 'animate-pulse' : ''}`} />
                    <span className={ollamaUp ? 'text-green-400' : 'text-red-400'}>
                        {isLoading
                            ? 'Connecting…'
                            : ollamaUp
                                ? `Ollama Running · ${models.length} model${models.length !== 1 ? 's' : ''}`
                                : 'Ollama not reachable — run: ollama serve'
                        }
                    </span>
                </div>
                <button onClick={() => refetch()} className="neu-btn-sm !p-1.5" title="Refresh">
                    <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Model picker (when Ollama is up) */}
            {ollamaUp && models.length > 0 ? (
                <div>
                    <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">Select Model</label>
                    <div className="relative">
                        <select
                            value={generationConfig.model_name}
                            onChange={e => setGenerationConfig(prev => ({ ...prev, model_name: e.target.value, provider: 'local' }))}
                            className="neu-input appearance-none cursor-pointer"
                        >
                            {models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neu-dim pointer-events-none" />
                    </div>
                    <p className="text-[10px] font-mono text-neu-dim mt-2">These are your locally pulled Ollama models.</p>
                </div>
            ) : !isLoading && (
                <div>
                    <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">Model Name</label>
                    <input
                        type="text"
                        value={generationConfig.model_name}
                        onChange={e => setGenerationConfig(prev => ({ ...prev, model_name: e.target.value, provider: 'local' }))}
                        placeholder="e.g. llama3.2, mistral, phi3"
                        className="neu-input"
                    />
                    <p className="text-[10px] font-mono text-neu-dim mt-2">
                        Pull a model first:&nbsp;
                        <span className="neu-chip !text-[10px]">ollama pull llama3.2</span>
                    </p>
                </div>
            )}
        </div>
    );
}

// ─── OpenAI API Section ───────────────────────────────────────────────────────
function ApiSection({ generationConfig, setGenerationConfig }) {
    const [showKey, setShowKey] = useState(false);
    const set = (key, val) => setGenerationConfig(prev => ({ ...prev, [key]: val, provider: 'openai' }));

    return (
        <div className="space-y-6">
            {/* API Key */}
            <div>
                <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">OpenAI API Key</label>
                <div className="relative">
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={generationConfig.api_key ?? ''}
                        onChange={e => set('api_key', e.target.value)}
                        placeholder="sk-..."
                        className="neu-input pr-20 font-mono text-sm"
                    />
                    <button
                        onClick={() => setShowKey(p => !p)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 neu-btn-sm text-[10px] uppercase font-bold"
                    >
                        {showKey ? 'Hide' : 'Show'}
                    </button>
                </div>
                <p className="text-[10px] font-mono text-neu-dim mt-2">Key is kept only in browser memory — never persisted to disk.</p>
            </div>

            {/* Model picker */}
            <div>
                <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">Model</label>
                <div className="grid grid-cols-2 gap-3">
                    {OPENAI_MODELS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => set('model_name', m.id)}
                            className={`flex flex-col gap-1 px-4 py-3 rounded-xl text-left transition-all duration-200 ${generationConfig.model_name === m.id
                                    ? 'neu-inset border border-neu-accent/20'
                                    : 'neu-plate hover:-translate-y-0.5'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className={`font-mono text-xs font-bold ${generationConfig.model_name === m.id ? 'text-neu-accent' : 'text-neu-text'}`}>{m.id}</span>
                                {generationConfig.model_name === m.id && <div className="led led-on" />}
                            </div>
                            <span className="text-[9px] text-neu-dim font-mono uppercase tracking-wide">{m.label}</span>
                        </button>
                    ))}
                </div>

                {/* Custom model ID */}
                <div className="mt-4">
                    <label className="block text-[10px] font-bold text-neu-dim tracking-widest uppercase mb-2">Custom Model ID</label>
                    <input
                        type="text"
                        value={OPENAI_MODELS.some(m => m.id === generationConfig.model_name) ? '' : generationConfig.model_name}
                        onChange={e => set('model_name', e.target.value)}
                        placeholder="e.g. gpt-4-vision-preview"
                        className="neu-input text-sm"
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Main Settings Panel ──────────────────────────────────────────────────────
export default function SettingsPanel({ pipelineConfig, setPipelineConfig, generationConfig, setGenerationConfig }) {
    const provider = generationConfig.provider ?? 'local';
    const setProvider = (p) => setGenerationConfig(prev => ({
        ...prev, provider: p,
        model_name: p === 'openai' ? OPENAI_MODELS[0].id : prev.model_name,
    }));

    return (
        <div className="space-y-10">

            {/* ── Chunking ────────────────────────────────────────── */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="led led-on" />
                    <h3 className="text-xs font-bold text-neu-dim tracking-widest uppercase">Chunking</h3>
                </div>
                <div className="neu-trough p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Slider
                        label="Chunk Size (tokens)"
                        min={200} max={2000} step={50}
                        value={pipelineConfig.chunk_size}
                        onChange={v => setPipelineConfig(prev => ({ ...prev, chunk_size: v }))}
                    />
                    <Slider
                        label="Chunk Overlap"
                        min={0} max={500} step={10}
                        value={pipelineConfig.chunk_overlap}
                        onChange={v => setPipelineConfig(prev => ({ ...prev, chunk_overlap: v }))}
                    />
                    <Slider
                        label="Similarity Threshold"
                        min={0.5} max={1.0} step={0.01}
                        value={pipelineConfig.similarity_threshold}
                        onChange={v => setPipelineConfig(prev => ({ ...prev, similarity_threshold: v }))}
                    />
                </div>
            </section>

            {/* ── Generation ──────────────────────────────────────── */}
            <section>
                <div className="flex items-center gap-3 mb-6">
                    <div className="led led-on" />
                    <h3 className="text-xs font-bold text-neu-dim tracking-widest uppercase">Generation</h3>
                </div>

                <div className="neu-plate rounded-2xl overflow-hidden">
                    {/* Provider toggle */}
                    <div className="flex gap-4 p-5 border-b border-white/[0.03]">
                        <ProviderBtn
                            active={provider === 'local'}
                            onClick={() => setProvider('local')}
                            icon={Cpu}
                            label="Local (Ollama)"
                            sublabel="Free · Runs on your machine"
                        />
                        <ProviderBtn
                            active={provider === 'openai'}
                            onClick={() => setProvider('openai')}
                            icon={Globe}
                            label="OpenAI API"
                            sublabel="GPT-4o · Requires API key"
                        />
                    </div>

                    {/* Provider-specific fields */}
                    <div className="p-6 border-b border-white/[0.03]">
                        {provider === 'local'
                            ? <LocalSection generationConfig={generationConfig} setGenerationConfig={setGenerationConfig} />
                            : <ApiSection generationConfig={generationConfig} setGenerationConfig={setGenerationConfig} />
                        }
                    </div>

                    {/* Shared params */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-white/[0.03]">
                        <Slider
                            label="Temperature"
                            min={0.0} max={2.0} step={0.1}
                            value={generationConfig.temperature}
                            onChange={v => setGenerationConfig(prev => ({ ...prev, temperature: v }))}
                        />
                        <div>
                            <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">Output Format</label>
                            <div className="relative">
                                <select
                                    value={generationConfig.format}
                                    onChange={e => setGenerationConfig(prev => ({ ...prev, format: e.target.value }))}
                                    className="neu-input appearance-none cursor-pointer"
                                >
                                    <option value="alpaca">Alpaca</option>
                                    <option value="sharegpt">ShareGPT</option>
                                    <option value="openai">OpenAI Chat</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neu-dim pointer-events-none" />
                            </div>
                        </div>
                        <div className="col-span-full">
                            <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">Domain Context</label>
                            <input
                                type="text"
                                value={generationConfig.domain}
                                onChange={e => setGenerationConfig(prev => ({ ...prev, domain: e.target.value }))}
                                placeholder="e.g. Finance, Biology, General"
                                className="neu-input"
                            />
                            <p className="text-[10px] font-mono text-neu-dim mt-2">Helps the LLM tailor QA pairs to your content area.</p>
                        </div>
                    </div>

                    {/* Advanced (collapsible) */}
                    <div className="p-6">
                        <details className="group">
                            <summary className="flex items-center justify-between cursor-pointer list-none mb-0">
                                <span className="text-xs font-bold text-neu-dim tracking-widest uppercase">Advanced Parameters</span>
                                <div className="neu-btn-sm !p-1.5">
                                    <ChevronDown size={12} className="group-open:rotate-180 transition-transform duration-300" />
                                </div>
                            </summary>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-white/[0.03]">
                                <Slider
                                    label="Top P"
                                    min={0.0} max={1.0} step={0.05}
                                    value={generationConfig.top_p ?? 1.0}
                                    onChange={v => setGenerationConfig(prev => ({ ...prev, top_p: v }))}
                                />
                                <Slider
                                    label="Presence Penalty"
                                    min={0.0} max={2.0} step={0.1}
                                    value={generationConfig.presence_penalty ?? 0.0}
                                    onChange={v => setGenerationConfig(prev => ({ ...prev, presence_penalty: v }))}
                                />
                                <Slider
                                    label="Frequency Penalty"
                                    min={0.0} max={2.0} step={0.1}
                                    value={generationConfig.frequency_penalty ?? 0.0}
                                    onChange={v => setGenerationConfig(prev => ({ ...prev, frequency_penalty: v }))}
                                />
                                <Slider
                                    label="QA Count Multiplier"
                                    min={0.5} max={3.0} step={0.1}
                                    value={generationConfig.qa_density_factor ?? 1.0}
                                    onChange={v => setGenerationConfig(prev => ({ ...prev, qa_density_factor: v }))}
                                />
                                <div>
                                    <label className="block text-xs font-bold text-neu-dim tracking-widest uppercase mb-3">Max Response Tokens</label>
                                    <input
                                        type="number"
                                        value={generationConfig.max_tokens ?? 0}
                                        onChange={e => setGenerationConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 0 }))}
                                        className="neu-input font-mono"
                                    />
                                    <p className="text-[10px] font-mono text-neu-dim mt-2">Set to 0 for model default.</p>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            </section>
        </div>
    );
}
