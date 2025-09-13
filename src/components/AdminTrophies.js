import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage } from './CommonUI';
import axios from 'axios';

const AdminTrophies = () => {
    const { user, isLoading: authLoading, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [trophies, setTrophies] = useState([]);
    const [stats, setStats] = useState({
        total_trophies: 0,
        common_trophies: 0,
        rare_trophies: 0,
        mythical_trophies: 0,
        total_awards: 0
    });
    const [filters, setFilters] = useState({
        rarity: '',
        search: ''
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_pages: 1,
        total_trophies: 0,
        trophies_per_page: 50
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingTrophy, setEditingTrophy] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        rarity: 'common'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assigningTrophy, setAssigningTrophy] = useState(null);
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');

    useEffect(() => {
        const verifyAdminAccess = async () => {
            if (authLoading) return;
            
            if (!user) {
                navigate('/');
                return;
            }

            const isAdmin = await checkAdminStatus();
            if (!isAdmin) {
                navigate('/');
                return;
            }

            setIsAuthorized(true);
            setIsLoading(false);
            await loadTrophiesData();
        };

        verifyAdminAccess();
    }, [user, authLoading, checkAdminStatus, navigate]);

    // Reload data when filters or pagination change
    useEffect(() => {
        if (isAuthorized) {
            loadTrophiesData();
        }
    }, [filters, pagination.current_page, isAuthorized]);

    const loadTrophiesData = async () => {
        try {
            setError(null);
            // Build query parameters
            const params = new URLSearchParams();
            if (filters.rarity) params.append('rarity', filters.rarity);
            if (filters.search) params.append('search', filters.search);
            params.append('page', pagination.current_page);
            params.append('limit', pagination.trophies_per_page);
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_get_trophies.php?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch trophies data');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to load trophies');
            }

            setTrophies(data.trophies);
            setStats(data.stats);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error loading trophies data:', error);
            setError(`Unable to load trophies data: ${error.message}`);
        }
    };

    const handleEditTrophy = (trophy = null) => {
        setEditingTrophy(trophy);
        if (trophy) {
            setFormData({
                name: trophy.name,
                description: trophy.description,
                image_url: trophy.image_path || '',
                rarity: trophy.rarity
            });
        } else {
            setFormData({
                name: '',
                description: '',
                image_url: '',
                rarity: 'common'
            });
        }
        setShowEditModal(true);
    };

    const handleSaveTrophy = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const submitData = {
                ...formData,
                ...(editingTrophy && { id: editingTrophy.id })
            };

            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_save_trophy.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(submitData)
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to save trophy');
            }

            setShowEditModal(false);
            setEditingTrophy(null);
            await loadTrophiesData();
        } catch (error) {
            console.error('Error saving trophy:', error);
            setError(`Failed to save trophy: ${error.message}`);
        }
        setIsSaving(false);
    };

    const handleDeleteTrophy = async (trophyId) => {
        if (!window.confirm('Are you sure you want to delete this trophy? This will also remove it from all users who have it.')) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_delete_trophy.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: trophyId })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete trophy');
            }

            await loadTrophiesData();
        } catch (error) {
            console.error('Error deleting trophy:', error);
            setError(`Failed to delete trophy: ${error.message}`);
        }
    };

    const handleAssignTrophy = async (trophy) => {
        setAssigningTrophy(trophy);
        setShowAssignModal(true);
        setUserSearch('');
        
        try {
            // Load users for assignment
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_get_users.php?limit=100`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            setError(`Failed to load users: ${error.message}`);
        }
    };

    const handleAssignTrophyToUser = async (userId) => {
        if (!assigningTrophy) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_assign_trophy.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    trophy_id: assigningTrophy.id
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to assign trophy');
            }

            setShowAssignModal(false);
            setAssigningTrophy(null);
            await loadTrophiesData(); // Refresh data to update user counts
        } catch (error) {
            console.error('Error assigning trophy:', error);
            setError(`Failed to assign trophy: ${error.message}`);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Please upload a JPEG, PNG, GIF, WebP, or SVG image.');
            return;
        }

        if (file.size > maxSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            setError(`File too large (${sizeMB}MB). Maximum size is 10MB.`);
            return;
        }

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('image', file);

            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/trophy_upload_image.php`,
                uploadFormData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    withCredentials: true
                }
            );

            if (!response.data.success) {
                throw new Error(response.data.message || 'Failed to upload image');
            }

            // Update the form data with the new image URL
            setFormData(prev => ({
                ...prev,
                image_url: response.data.image.url
            }));

        } catch (error) {
            console.error('Error uploading image:', error);
            if (error.response && error.response.data) {
                const errorMsg = error.response.data.error || error.response.data.message || error.message;
                setError(`Failed to upload image: ${errorMsg}`);
            } else {
                setError(`Failed to upload image: ${error.message}`);
            }
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
        setPagination(prev => ({
            ...prev,
            current_page: 1 // Reset to first page when filtering
        }));
    };

    const getRarityColor = (rarity) => {
        switch (rarity) {
            case 'mythical':
                return 'text-purple-600 bg-purple-100';
            case 'rare':
                return 'text-blue-600 bg-blue-100';
            case 'common':
                return 'text-green-600 bg-green-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verifying admin access...</p>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <nav className="flex mb-8" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                        <li className="inline-flex items-center">
                            <Link to="/admin" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-red-600">
                                <FontAwesomeIcon icon="home" className="w-4 h-4 mr-2" />
                                Admin Dashboard
                            </Link>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <FontAwesomeIcon icon="chevron-right" className="w-6 h-6 text-gray-400" />
                                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Trophy Management</span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Trophy Management</h1>
                        <p className="mt-2 text-gray-600">
                            Create, edit, and manage trophies and badges for users.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Link 
                            to="/admin/users"
                            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            <FontAwesomeIcon icon="users" className="mr-2" />
                            Manage Users
                        </Link>
                        <button 
                            onClick={() => handleEditTrophy()}
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-white transition-colors"
                        >
                            <FontAwesomeIcon icon="plus" className="mr-2" />
                            New Trophy
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6">
                        <ErrorMessage message={error} onRetry={() => setError(null)} />
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="trophy" className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Trophies</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_trophies}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="gem" className="h-6 w-6 text-green-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Common</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.common_trophies}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="gem" className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Rare</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.rare_trophies}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="gem" className="h-6 w-6 text-purple-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Mythical</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.mythical_trophies}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="award" className="h-6 w-6 text-orange-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Awards</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_awards}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Filter Trophies</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <label htmlFor="rarity-filter" className="block text-sm font-medium text-gray-700">Rarity</label>
                                <select 
                                    id="rarity-filter"
                                    value={filters.rarity}
                                    onChange={(e) => handleFilterChange('rarity', e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Rarities</option>
                                    <option value="common">Common</option>
                                    <option value="rare">Rare</option>
                                    <option value="mythical">Mythical</option>
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700">Search</label>
                                <input 
                                    type="text"
                                    id="search-filter"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    className="mt-1 focus:ring-red-500 focus:border-red-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                    placeholder="Search by trophy name or description..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trophies Grid */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Trophies</h3>
                            <div className="text-sm text-gray-500">
                                Showing {trophies.length} of {pagination.total_trophies} trophies
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {trophies.map((trophy) => (
                                <div key={trophy.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            {trophy.image_path ? (
                                                <img src={trophy.image_path} alt={trophy.name} className="w-12 h-12 rounded" />
                                            ) : (
                                                <FontAwesomeIcon icon="trophy" className="w-12 h-12 text-yellow-500" />
                                            )}
                                            <div>
                                                <h4 className="font-medium text-gray-900">{trophy.name}</h4>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRarityColor(trophy.rarity)}`}>
                                                    {trophy.rarity}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAssignTrophy(trophy)}
                                                className="text-green-600 hover:text-green-800"
                                                title="Assign to User"
                                            >
                                                <FontAwesomeIcon icon="user-plus" />
                                            </button>
                                            <button
                                                onClick={() => handleEditTrophy(trophy)}
                                                className="text-blue-600 hover:text-blue-800"
                                                title="Edit Trophy"
                                            >
                                                <FontAwesomeIcon icon="edit" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTrophy(trophy.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Delete Trophy"
                                            >
                                                <FontAwesomeIcon icon="trash" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">{trophy.description}</p>
                                    <div className="flex justify-between items-center text-sm text-gray-500">
                                        <span>{trophy.user_count} users have this</span>
                                        <span>Created {formatDate(trophy.created_at)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {trophies.length === 0 && (
                            <div className="text-center py-12">
                                <FontAwesomeIcon icon="trophy" className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No trophies found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Get started by creating your first trophy.
                                </p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => handleEditTrophy()}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                                    >
                                        <FontAwesomeIcon icon="plus" className="mr-2" />
                                        Create Trophy
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.total_pages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                                        disabled={pagination.current_page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, current_page: Math.min(prev.total_pages, prev.current_page + 1) }))}
                                        disabled={pagination.current_page === pagination.total_pages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing page <span className="font-medium">{pagination.current_page}</span> of{' '}
                                            <span className="font-medium">{pagination.total_pages}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => setPagination(prev => ({ ...prev, current_page: Math.max(1, prev.current_page - 1) }))}
                                                disabled={pagination.current_page === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <FontAwesomeIcon icon="chevron-left" className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => setPagination(prev => ({ ...prev, current_page: Math.min(prev.total_pages, prev.current_page + 1) }))}
                                                disabled={pagination.current_page === pagination.total_pages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                <FontAwesomeIcon icon="chevron-right" className="h-5 w-5" />
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Edit Trophy Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {editingTrophy ? 'Edit Trophy' : 'Create New Trophy'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <FontAwesomeIcon icon="times" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleSaveTrophy} className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="space-y-6">
                                    {/* Trophy Name */}
                                    <div>
                                        <label htmlFor="trophy-name" className="block text-sm font-medium text-gray-700 mb-2">
                                            Trophy Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="trophy-name"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="Enter trophy name..."
                                            required
                                            maxLength={100}
                                        />
                                    </div>

                                    {/* Trophy Description */}
                                    <div>
                                        <label htmlFor="trophy-description" className="block text-sm font-medium text-gray-700 mb-2">
                                            Description *
                                        </label>
                                        <textarea
                                            id="trophy-description"
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                            placeholder="Describe what this trophy represents..."
                                            required
                                            maxLength={500}
                                        />
                                        <p className="mt-1 text-sm text-gray-500">
                                            {formData.description.length}/500 characters
                                        </p>
                                    </div>

                                    {/* Rarity */}
                                    <div>
                                        <label htmlFor="trophy-rarity" className="block text-sm font-medium text-gray-700 mb-2">
                                            Rarity
                                        </label>
                                        <select
                                            id="trophy-rarity"
                                            value={formData.rarity}
                                            onChange={(e) => setFormData(prev => ({ ...prev, rarity: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        >
                                            <option value="common">Common</option>
                                            <option value="rare">Rare</option>
                                            <option value="mythical">Mythical</option>
                                        </select>
                                    </div>

                                    {/* Trophy Image */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Trophy Image
                                        </label>
                                        
                                        {formData.image_url && (
                                            <div className="mb-4">
                                                <img
                                                    src={formData.image_url}
                                                    alt="Trophy preview"
                                                    className="w-16 h-16 rounded border"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                                    className="mt-2 text-sm text-red-600 hover:text-red-800"
                                                >
                                                    <FontAwesomeIcon icon="times" className="mr-1" />
                                                    Remove Image
                                                </button>
                                            </div>
                                        )}

                                        <div className="mb-4">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                                            />
                                            <p className="mt-1 text-sm text-gray-500">
                                                Upload a JPEG, PNG, GIF, WebP, or SVG image (max 10MB)
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="trophy-image-url" className="block text-sm font-medium text-gray-700 mb-2">
                                                Or enter image URL
                                            </label>
                                            <input
                                                type="url"
                                                id="trophy-image-url"
                                                value={formData.image_url}
                                                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                                placeholder="https://example.com/trophy-image.png"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditModal(false)}
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSaving ? (
                                            <>
                                                <FontAwesomeIcon icon="spinner" className="animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            editingTrophy ? 'Update Trophy' : 'Create Trophy'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Assign Trophy Modal */}
                {showAssignModal && assigningTrophy && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Assign "{assigningTrophy.name}" Trophy
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowAssignModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <FontAwesomeIcon icon="times" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                <div className="mb-4">
                                    <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-2">
                                        Search Users
                                    </label>
                                    <input
                                        type="text"
                                        id="user-search"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Search by username, email, or display name..."
                                    />
                                </div>
                                
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {users
                                        .filter(user => 
                                            !userSearch || 
                                            user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                            user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                                            (user.display_name && user.display_name.toLowerCase().includes(userSearch.toLowerCase()))
                                        )
                                        .map(user => (
                                            <div 
                                                key={user.user_id} 
                                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 h-8 w-8">
                                                        {user.profile_picture_url ? (
                                                            <img className="h-8 w-8 rounded-full" src={user.profile_picture_url} alt="" />
                                                        ) : (
                                                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                                                <FontAwesomeIcon icon="user" className="text-gray-600 text-sm" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.display_name || user.username}
                                                        </div>
                                                        <div className="text-sm text-gray-500">@{user.username}</div>
                                                        <div className="text-xs text-gray-400">{user.total_trophies} trophies</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAssignTrophyToUser(user.user_id)}
                                                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                                >
                                                    Assign
                                                </button>
                                            </div>
                                        ))
                                    }
                                </div>
                                
                                {users.filter(user => 
                                    !userSearch || 
                                    user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                                    user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                                    (user.display_name && user.display_name.toLowerCase().includes(userSearch.toLowerCase()))
                                ).length === 0 && (
                                    <div className="text-center py-8">
                                        <FontAwesomeIcon icon="users" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                        <p className="text-gray-500 text-sm">No users found matching your search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTrophies;
