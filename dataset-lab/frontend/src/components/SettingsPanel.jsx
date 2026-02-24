import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const trackRef = useRef(null);
    const isDragging = useRef(false);
    const [active, setActive] = React.useState(false);
    const [dragPct, setDragPct] = React.useState(null); // Pure visual tracking

    const clamp = useCallback((raw) => {
        const steps = Math.round((raw - min) / step);
        const snapped = min + steps * step;
        const clamped = Math.min(max, Math.max(min, snapped));
        return step < 1 ? parseFloat(clamped.toFixed(2)) : Math.round(clamped);
    }, [min, max, step]);

    const handlePointerMove = useCallback((e) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        // Calculate clamped ratio strictly between 0 and 1
        const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));

        // 1. Update visual indicator smoothly (no steps)
        setDragPct(ratio * 100);

        // 2. Propagate the snapped value to parent
        onChange(clamp(min + ratio * (max - min)));
    }, [min, max, clamp, onChange]);

    const onPointerDown = useCallback((e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        isDragging.current = true;
        setActive(true);
        handlePointerMove(e);
    }, [handlePointerMove]);

    const onPointerMove = useCallback((e) => {
        if (!isDragging.current) return;
        handlePointerMove(e);
    }, [handlePointerMove]);

    const onPointerUp = useCallback(() => {
        isDragging.current = false;
        setActive(false);
        setDragPct(null); // Snap back to true value visually on release
    }, []);

    // If actively dragging, use the buttery smooth internal percentage. 
    // Otherwise, base the visual position on the parent's actual grounded value.
    const pct = active && dragPct !== null
        ? dragPct
        : Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
        <div className="select-none">
            <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-neu-dim tracking-widest uppercase">{label}</label>
                <span
                    className="text-xs font-mono px-2 py-0.5 rounded border transition-all duration-200"
                    style={{
                        color: active ? 'var(--accent-light)' : 'var(--accent)',
                        background: active ? 'rgba(255,107,0,0.15)' : 'rgba(255,107,0,0.08)',
                        borderColor: active ? 'rgba(255,107,0,0.4)' : 'rgba(255,107,0,0.2)',
                        boxShadow: active ? '0 0 8px rgba(255,107,0,0.3)' : 'none',
                    }}
                >
                    {value}
                </span>
            </div>

            {/* Track area — captures pointer events */}
            <div
                ref={trackRef}
                className="relative h-10 flex items-center cursor-pointer touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                {/* Sunken trough */}
                <div
                    className="absolute inset-y-0 my-auto w-full rounded-full pointer-events-none"
                    style={{
                        height: '8px',
                        background: 'var(--bg-dark)',
                        boxShadow: 'inset 3px 3px 7px #111315, inset -3px -3px 7px #2c323a',
                        border: '1px solid rgba(0,0,0,0.35)',
                    }}
                />

                {/* Filled portion */}
                <div
                    className="absolute left-0 rounded-full pointer-events-none"
                    style={{
                        height: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: `${pct}%`,
                        background: active
                            ? 'linear-gradient(90deg, #ff6b00, #ff9d4d)'
                            : 'linear-gradient(90deg, #cc5500, #ff6b00)',
                        boxShadow: active
                            ? '0 0 12px rgba(255,107,0,0.7), 0 0 24px rgba(255,107,0,0.3)'
                            : '0 0 6px rgba(255,107,0,0.4)',
                        transition: 'background 0.2s ease, box-shadow 0.2s ease',
                        borderRadius: '99px',
                    }}
                />

                {/* Thumb */}
                <div
                    className="absolute pointer-events-none flex items-center justify-center"
                    style={{
                        left: `calc(${pct}% - ${active ? 13 : 11}px)`,
                        top: '50%',
                        transform: `translateY(-50%) scale(${active ? 1.15 : 1})`,
                        width: active ? '26px' : '22px',
                        height: active ? '26px' : '22px',
                        borderRadius: '50%',
                        background: 'var(--bg-dark)',
                        border: active ? '2px solid var(--accent)' : '1px solid rgba(255,107,0,0.4)',
                        boxShadow: active
                            ? `0 0 16px rgba(255,107,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1), 4px 4px 10px rgba(0,0,0,0.6)`
                            : `0 4px 8px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.05)`,
                        transition: 'width 0.15s ease, height 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, border 0.15s ease',
                        zIndex: 10,
                    }}
                >
                    {/* Inner glowing core */}
                    <div
                        style={{
                            width: active ? '8px' : '4px',
                            height: active ? '8px' : '4px',
                            borderRadius: '50%',
                            background: active ? 'var(--accent-light)' : 'var(--accent)',
                            boxShadow: active ? '0 0 10px var(--accent-light)' : 'none',
                            transition: 'all 0.15s ease',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Custom Select ────────────────────────────────────────────────────────────
function CustomSelect({ value, options, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(o => o.value === value) || options[0];

    return (
        <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-30'}`}>
            {/* The closed / trigger state */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full neu-input flex items-center justify-between text-left transition-all duration-200 relative z-20 ${isOpen
                    ? 'rounded-b-none border-t-neu-accent border-l-neu-accent border-r-neu-accent border-b-transparent shadow-[0_0_15px_rgba(255,107,0,0.2)] bg-neu-dark'
                    : 'border-transparent'
                    }`}
                style={isOpen ? { boxShadow: '0 -4px 12px rgba(255,107,0,0.1)' } : {}}
            >
                <span className={!value ? 'text-neu-dim/30' : 'text-neu-text'}>
                    {selectedOption?.label || value || "Select..."}
                </span>
                <ChevronDown size={14} className={`text-neu-dim transition-transform duration-300 ${isOpen ? 'rotate-180 text-neu-accent' : ''}`} />
            </button>

            {/* The open dropdown menu */}
            {isOpen && (
                <div className="absolute top-[100%] left-0 w-full bg-neu-dark overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.8)] border border-t-0 border-neu-accent rounded-b-xl animate-in fade-in slide-in-from-top-1 duration-200 z-10 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/5">
                    <div className="max-h-60 overflow-y-auto w-full custom-scrollbar pb-1">
                        {options.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm transition-colors duration-150 flex items-center justify-between group ${value === opt.value
                                    ? 'bg-neu-accent/10 border-l-[3px] border-neu-accent text-neu-accent font-medium'
                                    : 'hover:bg-white/[0.03] text-neu-dim hover:text-neu-text border-l-[3px] border-transparent'
                                    }`}
                            >
                                <span>{opt.label}</span>
                                {value === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-neu-accent shadow-[0_0_8px_rgba(255,107,0,0.8)]" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Provider Button ──────────────────────────────────────────────────────────
function ProviderBtn({ active, onClick, icon: Icon, label, sublabel }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-3 py-5 px-4 rounded-2xl relative overflow-hidden shrink-0 touch-manipulation select-none outline-none ${active
                ? 'bg-neu-dark text-neu-accent shadow-[inset_4px_4px_10px_#0e1012,inset_-4px_-4px_10px_#272d33] border border-black/40 scale-[0.98]'
                : 'bg-neu-base text-neu-dim shadow-[6px_6px_14px_#111315,-6px_-6px_14px_#2e343b] hover:shadow-[8px_8px_18px_#111315,-8px_-8px_18px_#2e343b] hover:-translate-y-0.5 border border-white/5'
                }`}
            style={{
                transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease'
            }}
        >
            <div className={`p-3 rounded-[14px] transition-all duration-150 ${active
                ? 'bg-[#15181b] shadow-[inset_2px_2px_4px_#0e1012,inset_-2px_-2px_4px_#272d33,0_0_15px_rgba(255,107,0,0.15)] text-neu-accent ring-1 ring-neu-accent/20'
                : 'bg-neu-base shadow-[4px_4px_8px_#111315,-4px_-4px_8px_#2e343b] text-neu-dim'
                }`}>
                <Icon size={24} strokeWidth={active ? 2 : 1.5} className={active ? 'drop-shadow-[0_0_8px_rgba(255,107,0,0.8)]' : ''} />
            </div>

            <div className="flex flex-col items-center gap-1 mt-1">
                <p className={`text-[13px] font-bold tracking-widest uppercase transition-colors duration-150 ${active ? 'text-neu-accent drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]' : 'text-neu-text'}`}>
                    {label}
                </p>
                <p className={`text-[10px] font-mono transition-colors duration-150 ${active ? 'text-neu-accent/70' : 'text-neu-dim/70'}`}>
                    {sublabel}
                </p>
            </div>

            {/* Active Indication LED */}
            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-all duration-200 ${active
                ? 'bg-neu-accent shadow-[0_0_10px_rgba(255,107,0,1)]'
                : 'bg-black/40 shadow-[inset_1px_1px_2px_#000]'
                }`} />
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
                    <CustomSelect
                        value={generationConfig.model_name}
                        onChange={v => setGenerationConfig(prev => ({ ...prev, model_name: v, provider: 'local' }))}
                        options={models.map(m => ({ value: m, label: m }))}
                    />
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
                    {OPENAI_MODELS.map(m => {
                        const active = generationConfig.model_name === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => set('model_name', m.id)}
                                className={`flex flex-col gap-1 px-4 py-3 rounded-2xl relative overflow-hidden shrink-0 touch-manipulation select-none outline-none text-left ${active
                                    ? 'bg-neu-dark shadow-[inset_4px_4px_10px_#0e1012,inset_-4px_-4px_10px_#272d33] border border-black/40 scale-[0.98]'
                                    : 'bg-neu-base shadow-[4px_4px_10px_#111315,-4px_-4px_10px_#2e343b] hover:shadow-[6px_6px_14px_#111315,-6px_-6px_14px_#2e343b] hover:-translate-y-0.5 border border-white/5'
                                    }`}
                                style={{
                                    transition: 'transform 0.1s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.1s cubic-bezier(0.4, 0, 0.2, 1), background 0.15s ease'
                                }}
                            >
                                <span className={`font-mono text-[13px] font-bold transition-colors duration-150 ${active ? 'text-neu-accent drop-shadow-[0_0_8px_rgba(255,107,0,0.4)]' : 'text-neu-text'}`}>
                                    {m.id}
                                </span>
                                <span className={`text-[9px] font-mono uppercase tracking-wide transition-colors duration-150 ${active ? 'text-neu-accent/70' : 'text-neu-dim/70'}`}>
                                    {m.label}
                                </span>

                                {/* Status LED */}
                                <div className={`absolute top-4 right-4 w-2 h-2 rounded-full transition-all duration-200 ${active
                                    ? 'bg-neu-accent shadow-[0_0_10px_rgba(255,107,0,1)]'
                                    : 'bg-black/40 shadow-[inset_1px_1px_2px_#000]'
                                    }`} />
                            </button>
                        );
                    })}
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
                            <CustomSelect
                                value={generationConfig.format}
                                onChange={v => setGenerationConfig(prev => ({ ...prev, format: v }))}
                                options={[
                                    { value: 'alpaca', label: 'Alpaca' },
                                    { value: 'sharegpt', label: 'ShareGPT' },
                                    { value: 'openai', label: 'OpenAI Chat' },
                                ]}
                            />
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
