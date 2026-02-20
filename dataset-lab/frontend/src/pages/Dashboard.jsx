import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '../api/api';
import { Link } from 'react-router-dom';
import { FolderPlus, Folder, Trash2 } from 'lucide-react';

export default function Dashboard() {
    const [newProjectName, setNewProjectName] = useState('');
    const queryClient = useQueryClient();

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: projectApi.list
    });

    const createMutation = useMutation({
        mutationFn: (name) => projectApi.create(name),
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
            setNewProjectName('');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (name) => projectApi.delete(name),
        onSuccess: () => {
            queryClient.invalidateQueries(['projects']);
        },
        onError: (e) => alert(`Delete failed: ${e.message}`)
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (newProjectName.trim()) {
            createMutation.mutate(newProjectName);
        }
    };

    const handleDelete = (e, name) => {
        e.preventDefault(); // Prevent Link navigation
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to permanently delete "${name}" and all its data?`)) {
            deleteMutation.mutate(name);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-light text-neu-text mb-12 tracking-tight">Console <span className="text-neu-dim font-thin">/ Projects</span></h1>

            <form onSubmit={handleCreate} className="mb-16 flex gap-8 max-w-2xl relative z-10 p-2">
                <div className="relative flex-1 group">
                    <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Nomenclature for new protocol..."
                        className="neu-input h-14 pl-6 text-lg placeholder-neu-dim/30 bg-neu-base focus:text-neu-accent"
                    />
                    <div className="absolute inset-0 rounded-2xl pointer-events-none border border-white/5 group-hover:border-white/10 transition-colors"></div>
                </div>
                <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="neu-btn neu-btn-primary h-14 px-8 gap-3 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/20"
                >
                    <FolderPlus size={22} strokeWidth={2} />
                    <span className="font-semibold tracking-wide">INITIALIZE</span>
                </button>
            </form>

            {isLoading ? (
                <div className="text-neu-dim animate-pulse font-mono tracking-widest text-sm uppercase">Loading sector map...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {projects.map((name) => (
                        <div key={name} className="relative group perspective-1000">
                            <Link
                                to={`/project/${name}`}
                                className="neu-plate p-8 flex flex-col gap-6 w-full h-full min-h-[220px] group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 ease-out relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-32 bg-neu-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                                <div className="flex items-start justify-between z-10">
                                    <div className="w-16 h-16 rounded-2xl neu-inset flex items-center justify-center text-neu-dim group-hover:text-neu-accent transition-colors duration-300 shadow-inner border border-white/5">
                                        <Folder size={32} strokeWidth={1.5} />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-neu-dim/20 group-hover:bg-neu-accent group-hover:shadow-[0_0_8px_rgba(255,107,0,0.8)] transition-all duration-500 delay-100"></div>
                                        <div className="w-2 h-2 rounded-full bg-neu-dim/20 group-hover:bg-neu-accent group-hover:shadow-[0_0_8px_rgba(255,107,0,0.8)] transition-all duration-500 delay-200"></div>
                                    </div>
                                </div>

                                <div className="z-10 mt-auto">
                                    <span className="text-2xl font-medium text-neu-text tracking-tight block truncate group-hover:text-white transition-colors" title={name}>{name}</span>
                                    <span className="text-xs font-mono text-neu-dim/60 mt-2 block uppercase tracking-widest">Active Protocol</span>
                                </div>
                            </Link>

                            {/* Delete Button - Floating Orb */}
                            <button
                                onClick={(e) => handleDelete(e, name)}
                                disabled={deleteMutation.isPending}
                                title="Purge Protocol"
                                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-neu-base shadow-[5px_5px_10px_#16191c,-5px_-5px_10px_#2c3036] flex items-center justify-center text-neu-dim hover:text-red-500 hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 hover:scale-110"
                            >
                                <Trash2 size={16} strokeWidth={2} />
                            </button>
                        </div>
                    ))}
                    {projects.length === 0 && (
                        <div className="col-span-full py-32 text-center rounded-3xl border-2 border-dashed border-neu-dim/10 bg-neu-base/50">
                            <div className="w-24 h-24 mx-auto rounded-full neu-inset flex items-center justify-center text-neu-dim/20 mb-8 shadow-inner">
                                <FolderPlus size={40} strokeWidth={1} />
                            </div>
                            <p className="text-neu-dim font-light text-xl">Sector Empty</p>
                            <p className="text-neu-dim/40 text-sm mt-2 font-mono uppercase tracking-widest">Initialize new protocol to begin</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
