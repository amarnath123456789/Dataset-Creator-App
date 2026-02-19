import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { llmApi } from '../api/api';
import { Cpu, Globe, RefreshCw, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';

// ── OpenAI model presets ────────────────────────────────────────────────────
const OPENAI_MODELS = [
    { id: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast + Cheap)' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

// ── Generic slider + label ──────────────────────────────────────────────────
function Slider({ label, min, max, step, value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type="range" min={min} max={max} step={step}
                value={value}
                onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                className="w-full accent-blue-600"
            />
            <div className="text-right text-sm text-blue-600 font-mono">{value}</div>
        </div>
    );
}

// ── Provider toggle button ──────────────────────────────────────────────────
function ProviderBtn({ active, onClick, icon: Icon, label, sublabel }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex flex-col items-center gap-1 py-4 px-6 rounded-xl border-2 transition-all duration-200 ${active
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                }`}
        >
            <Icon size={22} className={active ? 'text-blue-600' : 'text-gray-400'} />
            <span className={`text-sm font-semibold ${active ? 'text-blue-700' : 'text-gray-600'}`}>{label}</span>
            <span className="text-xs text-gray-400">{sublabel}</span>
        </button>
    );
}

// ── LOCAL SECTION ───────────────────────────────────────────────────────────
function LocalSection({ generationConfig, setGenerationConfig }) {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['ollama-models'],
        queryFn: llmApi.getOllamaModels,
        staleTime: 30_000,
        retry: false,
    });

    const models = data?.models ?? [];
    const ollamaUp = data?.available ?? false;

    // When models load in, auto-select if current model_name isn't in list
    useEffect(() => {
        if (models.length > 0 && !models.includes(generationConfig.model_name)) {
            setGenerationConfig(prev => ({ ...prev, model_name: models[0], provider: 'local' }));
        }
    }, [models]);

    return (
        <div className="space-y-5">
            {/* Status badge */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${ollamaUp ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                <div className="flex items-center gap-2">
                    {isLoading
                        ? <RefreshCw size={14} className="animate-spin" />
                        : ollamaUp
                            ? <CheckCircle size={14} />
                            : <AlertCircle size={14} />
                    }
                    {isLoading
                        ? 'Connecting to Ollama...'
                        : ollamaUp
                            ? `Ollama running · ${models.length} model${models.length !== 1 ? 's' : ''} available`
                            : 'Ollama not reachable · run: ollama serve'
                    }
                </div>
                <button
                    onClick={() => refetch()}
                    className="hover:opacity-70 transition"
                    title="Refresh"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Model picker */}
            {ollamaUp && models.length > 0 ? (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Model</label>
                    <div className="relative">
                        <select
                            value={generationConfig.model_name}
                            onChange={e => setGenerationConfig(prev => ({ ...prev, model_name: e.target.value, provider: 'local' }))}
                            className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 pr-10 bg-white text-gray-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {models.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">These are your locally pulled Ollama models.</p>
                </div>
            ) : !isLoading && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Model Name</label>
                    <input
                        type="text"
                        value={generationConfig.model_name}
                        onChange={e => setGenerationConfig(prev => ({ ...prev, model_name: e.target.value, provider: 'local' }))}
                        placeholder="e.g. llama3.2, mistral, phi3"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Pull a model first: <code className="bg-gray-100 px-1 rounded">ollama pull llama3.2</code>
                    </p>
                </div>
            )}
        </div>
    );
}

// ── API SECTION ─────────────────────────────────────────────────────────────
function ApiSection({ generationConfig, setGenerationConfig }) {
    const [showKey, setShowKey] = useState(false);

    const set = (key, value) => setGenerationConfig(prev => ({ ...prev, [key]: value, provider: 'openai' }));

    return (
        <div className="space-y-5">
            {/* API Key */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                </label>
                <div className="relative">
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={generationConfig.api_key ?? ''}
                        onChange={e => set('api_key', e.target.value)}
                        placeholder="sk-..."
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-20 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => setShowKey(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium"
                    >
                        {showKey ? 'Hide' : 'Show'}
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                    Key is kept only in browser memory — never persisted to disk.
                </p>
            </div>

            {/* Model picker */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <div className="grid grid-cols-2 gap-2">
                    {OPENAI_MODELS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => set('model_name', m.id)}
                            className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${generationConfig.model_name === m.id
                                    ? 'border-blue-600 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300 bg-white'
                                }`}
                        >
                            <div className={`text-sm font-semibold ${generationConfig.model_name === m.id ? 'text-blue-700' : 'text-gray-700'}`}>
                                {m.id}
                            </div>
                            <div className="text-xs text-gray-400">{m.label.split('(')[1]?.replace(')', '') ?? ''}</div>
                        </button>
                    ))}
                </div>
                <div className="mt-3">
                    <label className="block text-xs text-gray-500 mb-1">Or enter a custom model ID</label>
                    <input
                        type="text"
                        value={OPENAI_MODELS.some(m => m.id === generationConfig.model_name) ? '' : generationConfig.model_name}
                        onChange={e => set('model_name', e.target.value)}
                        placeholder="e.g. gpt-4-vision-preview"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SettingsPanel({ pipelineConfig, setPipelineConfig, generationConfig, setGenerationConfig }) {
    // Determine active tab from generationConfig.provider (default 'local')
    const provider = generationConfig.provider ?? 'local';
    const setProvider = (p) => setGenerationConfig(prev => ({
        ...prev,
        provider: p,
        model_name: p === 'openai' ? (OPENAI_MODELS[0].id) : prev.model_name,
    }));

    return (
        <div className="space-y-10">

            {/* ── Chunking ─────────────────────────────────────────── */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Chunking Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <Slider
                        label="Chunk Size (Tokens)"
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

            {/* ── Generation ───────────────────────────────────────── */}
            <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Generation Configuration</h3>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">

                    {/* Provider toggle */}
                    <div className="flex gap-3 p-5 bg-gray-50 border-b border-gray-100">
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
                    <div className="p-6 bg-white">
                        {provider === 'local'
                            ? <LocalSection generationConfig={generationConfig} setGenerationConfig={setGenerationConfig} />
                            : <ApiSection generationConfig={generationConfig} setGenerationConfig={setGenerationConfig} />
                        }
                    </div>

                    {/* Shared: Temperature + Format + Domain */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 border-t border-gray-100">
                        <Slider
                            label="Temperature"
                            min={0.0} max={2.0} step={0.1}
                            value={generationConfig.temperature}
                            onChange={v => setGenerationConfig(prev => ({ ...prev, temperature: v }))}
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Output Format</label>
                            <div className="relative">
                                <select
                                    value={generationConfig.format}
                                    onChange={e => setGenerationConfig(prev => ({ ...prev, format: e.target.value }))}
                                    className="w-full appearance-none border border-gray-300 rounded-xl px-4 py-3 pr-10 bg-white text-gray-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="alpaca">Alpaca</option>
                                    <option value="sharegpt">ShareGPT</option>
                                    <option value="openai">OpenAI Chat</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Domain Context</label>
                            <input
                                type="text"
                                value={generationConfig.domain}
                                onChange={e => setGenerationConfig(prev => ({ ...prev, domain: e.target.value }))}
                                placeholder="e.g. Finance, Biology, General"
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Helps the LLM tailor QA pairs to your content area.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
