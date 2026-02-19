import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/api';
import { ArrowLeft, Play, Upload, Settings, FileText, Download, CheckCircle, AlertCircle, Loader2, BarChart2 } from 'lucide-react';
import SettingsPanel from '../components/SettingsPanel';
import DebugDashboard from '../components/DebugDashboard';

export default function Workspace() {
    const { name } = useParams();
    const [activeTab, setActiveTab] = useState('upload');
    const [pipelineConfig, setPipelineConfig] = useState({
        chunk_size: 800,
        chunk_overlap: 100,
        similarity_threshold: 0.92
    });
    const [generationConfig, setGenerationConfig] = useState({
        provider: 'local',
        model_name: 'llama3.2',
        temperature: 0.7,
        top_p: 0.9,
        domain: 'general',
        format: 'alpaca',
        api_key: '',
    });
    const [uploadFile, setUploadFile] = useState(null);

    const queryClient = useQueryClient();

    // Poll status every 2 seconds
    const { data: status } = useQuery({
        queryKey: ['status', name],
        queryFn: () => projectApi.getStatus(name),
        refetchInterval: 2000
    });

    const uploadMutation = useMutation({
        mutationFn: (file) => projectApi.upload(name, file),
        onSuccess: () => {
            queryClient.invalidateQueries(['status', name]);
            setActiveTab('clean'); // Move to next step logically? Or stay.
            alert("Upload successful");
        },
        onError: (e) => alert(`Upload failed: ${e.message}`)
    });

    const saveDebugData = (patch) => {
        try {
            const key = `debug_${name}`;
            const existing = JSON.parse(localStorage.getItem(key) || '{}');
            localStorage.setItem(key, JSON.stringify({ ...existing, ...patch }));
        } catch { }
    };

    const runPipelineMutation = useMutation({
        mutationFn: () => projectApi.runPipeline(name, {
            pipeline_config: pipelineConfig,
            generation_config: generationConfig
        }),
        onSuccess: (data) => {
            saveDebugData({
                timestamp: new Date().toISOString(),
                pipelineConfig,
                generationConfig,
                // Store pipeline result data if backend returns it
                cleanedText: data?.cleaned_text ?? data?.cleanedText ?? null,
                rawLength: data?.raw_length ?? data?.rawLength ?? null,
                cleanedLength: data?.cleaned_length ?? data?.cleanedLength ?? null,
                chunks: data?.chunks ?? null,
                qaPairs: data?.qa_pairs ?? data?.qaPairs ?? null,
            });
            alert("Pipeline started!");
        }
    });

    const handleUpload = () => {
        if (uploadFile) uploadMutation.mutate(uploadFile);
    };

    const tabs = [
        { id: 'upload', label: '1. Upload', icon: Upload },
        { id: 'settings', label: '2. Settings', icon: Settings },
        { id: 'run', label: '3. Run Pipeline', icon: Play },
        { id: 'dashboard', label: '4. Dashboard', icon: BarChart2 },
        { id: 'export', label: '5. Export', icon: Download },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <Link to="/" className="flex items-center text-gray-500 hover:text-blue-600">
                    <ArrowLeft size={20} className="mr-2" /> Back to Projects
                </Link>
                <span className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">{name}</span>
            </div>

            {/* Progress / Status Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 flex justify-between items-center">
                <div className="flex gap-4">
                    <StatusItem label="Raw Text" active={status?.has_raw} />
                    <StatusItem label="Cleaned" active={status?.has_cleaned} />
                    <StatusItem label="Chunks" active={status?.has_chunks} count={status?.chunk_count} />
                    <StatusItem label="QA Pairs" active={status?.has_qa} count={status?.qa_count} />
                </div>
            </div>

            <div className="flex gap-6">
                {/* Sidebar Tabs */}
                <div className="w-64 flex flex-col gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white hover:bg-gray-50 text-gray-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border p-8 min-h-[500px]">
                    {activeTab === 'upload' && (
                        <div className="text-center py-12">
                            <div className="mb-6">
                                <Upload size={48} className="mx-auto text-gray-300 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800">Upload Source Text</h2>
                                <p className="text-gray-500">Supported formats: .txt</p>
                            </div>
                            <label className="block max-w-sm mx-auto cursor-pointer">
                                <span className="sr-only">Choose file</span>
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={(e) => setUploadFile(e.target.files[0])}
                                    className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100 mb-4"
                                />
                            </label>
                            <button
                                onClick={handleUpload}
                                disabled={!uploadFile || uploadMutation.isPending}
                                className="bg-blue-600 text-white px-8 py-2 rounded-lg disabled:opacity-50"
                            >
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
                            </button>
                            {status?.has_raw && <p className="mt-4 text-green-600 flex items-center justify-center gap-2"><CheckCircle size={16} /> File uploaded</p>}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <SettingsPanel
                            pipelineConfig={pipelineConfig}
                            setPipelineConfig={setPipelineConfig}
                            generationConfig={generationConfig}
                            setGenerationConfig={setGenerationConfig}
                        />
                    )}

                    {activeTab === 'run' && (
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-bold mb-4">Run Pipeline</h2>
                            <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                                This will process the document through: Cleaning &rarr; Chunking &rarr; Embedding Refinement &rarr; QA Generation.
                                This may take a while depending on the text size.
                            </p>

                            <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg inline-block mb-8 text-left">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Chunk Size: {pipelineConfig.chunk_size}</li>
                                    <li>Provider: {generationConfig.provider === 'openai' ? 'OpenAI API' : 'Ollama (Local)'}</li>
                                    <li>Model: {generationConfig.model_name}</li>
                                    <li>Format: {generationConfig.format}</li>
                                </ul>
                            </div>

                            <div className="block">
                                <button
                                    onClick={() => runPipelineMutation.mutate()}
                                    disabled={runPipelineMutation.isPending || !status?.has_raw}
                                    className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 flex items-center gap-3 mx-auto"
                                >
                                    {runPipelineMutation.isPending ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                                    Start Processing
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'export' && (
                        <div className="text-center py-12">
                            <h2 className="text-2xl font-bold mb-6">Export Dataset</h2>
                            <p className="text-gray-600 mb-8">Download your generated QA pairs in JSONL format.</p>

                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={async () => {
                                        const response = await projectApi.export(name, 'alpaca');
                                        const url = window.URL.createObjectURL(response.data);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', `export_alpaca.jsonl`);
                                        document.body.appendChild(link);
                                        link.click();
                                    }}
                                    disabled={!status?.has_qa}
                                    className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    Download JSONL
                                </button>
                            </div>
                            {!status?.has_qa && <p className="mt-4 text-red-500">No QA pairs generated yet.</p>}
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <DebugDashboard projectName={name} status={status} />
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusItem({ label, active, count }) {
    return (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {active ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {label}
            {count !== undefined && <span className="ml-1 bg-white px-2 py-0.5 rounded-full text-xs shadow-sm border">{count}</span>}
        </div>
    )
}
