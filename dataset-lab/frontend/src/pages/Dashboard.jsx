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
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Projects</h1>

            <form onSubmit={handleCreate} className="mb-8 flex gap-4 max-w-md">
                <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="New Project Name"
                    className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                    <FolderPlus size={20} />
                    Create
                </button>
            </form>

            {isLoading ? (
                <div className="text-gray-500">Loading projects...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((name) => (
                        <div key={name} className="relative group">
                            <Link
                                to={`/project/${name}`}
                                className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow flex items-center gap-4 w-full"
                            >
                                <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                                    <Folder className="text-blue-600" size={24} />
                                </div>
                                <span className="font-semibold text-lg">{name}</span>
                            </Link>
                            <button
                                onClick={(e) => handleDelete(e, name)}
                                disabled={deleteMutation.isPending}
                                title="Delete project"
                                className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {projects.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                            No projects yet. Create one to get started.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
