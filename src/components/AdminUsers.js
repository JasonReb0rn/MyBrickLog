import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage } from './CommonUI';

const AdminUsers = () => {
    const { user, isLoading: authLoading, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState({
        total_users: 0,
        verified_users: 0,
        admin_users: 0,
        new_this_week: 0,
        active_this_month: 0
    });
    const [filters, setFilters] = useState({
        verified: '',
        is_admin: '',
        search: ''
    });
    const [pagination, setPagination] = useState({
        current_page: 1,
        total_pages: 1,
        total_users: 0,
        users_per_page: 50
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [showTrophyModal, setShowTrophyModal] = useState(false);
    const [userTrophies, setUserTrophies] = useState([]);
    const [allTrophies, setAllTrophies] = useState([]);
    const [isLoadingTrophies, setIsLoadingTrophies] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifyAdminAccess = async () => {
            // Wait for auth loading to complete
            if (authLoading) {
                return;
            }
            
            // First check if user is logged in
            if (!user) {
                console.log('No user logged in, redirecting to home');
                navigate('/');
                return;
            }

            // Check if user has admin privileges
            const isAdmin = await checkAdminStatus();
            
            if (!isAdmin) {
                console.log('User is not admin, redirecting to home');
                navigate('/');
                return;
            }

            setIsAuthorized(true);
            setIsLoading(false);
            await loadUsersData();
        };

        verifyAdminAccess();
    }, [user, authLoading, checkAdminStatus, navigate]);

    // Reload data when filters or pagination change
    useEffect(() => {
        if (isAuthorized) {
            loadUsersData();
        }
    }, [filters, pagination.current_page, isAuthorized]);

    const loadUsersData = async () => {
        try {
            setError(null);
            // Build query parameters
            const params = new URLSearchParams();
            if (filters.verified) params.append('verified', filters.verified);
            if (filters.is_admin) params.append('is_admin', filters.is_admin);
            if (filters.search) params.append('search', filters.search);
            params.append('page', pagination.current_page);
            params.append('limit', pagination.users_per_page);
            
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_get_users.php?${params}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch users data');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to load users');
            }

            setUsers(data.users);
            setStats(data.stats);
            setPagination(data.pagination);
        } catch (error) {
            console.error('Error loading users data:', error);
            setError(`Unable to load users data: ${error.message}`);
        }
    };

    const handleTrophyManagement = async (user) => {
        setSelectedUser(user);
        setShowTrophyModal(true);
        setIsLoadingTrophies(true);
        
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_get_user_trophies.php?user_id=${user.user_id}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user trophies');
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to load user trophies');
            }

            setUserTrophies(data.user_trophies);
            setAllTrophies(data.all_trophies);
        } catch (error) {
            console.error('Error loading user trophies:', error);
            setError(`Unable to load user trophies: ${error.message}`);
        }
        
        setIsLoadingTrophies(false);
    };

    const handleAssignTrophy = async (trophyId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_assign_trophy.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: selectedUser.user_id,
                    trophy_id: trophyId
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to assign trophy');
            }

            // Refresh trophy data
            await handleTrophyManagement(selectedUser);
            // Refresh users data to update trophy counts
            await loadUsersData();
        } catch (error) {
            console.error('Error assigning trophy:', error);
            setError(`Failed to assign trophy: ${error.message}`);
        }
    };

    const handleRemoveTrophy = async (trophyId) => {
        if (!window.confirm('Are you sure you want to remove this trophy from the user?')) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_remove_trophy.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: selectedUser.user_id,
                    trophy_id: trophyId
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to remove trophy');
            }

            // Refresh trophy data
            await handleTrophyManagement(selectedUser);
            // Refresh users data to update trophy counts
            await loadUsersData();
        } catch (error) {
            console.error('Error removing trophy:', error);
            setError(`Failed to remove trophy: ${error.message}`);
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

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">User Management</span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="mt-2 text-gray-600">
                            Manage user accounts, permissions, and trophy assignments.
                        </p>
                    </div>
                    <Link 
                        to="/admin/trophies"
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-white transition-colors"
                    >
                        <FontAwesomeIcon icon="trophy" className="mr-2" />
                        Manage Trophies
                    </Link>
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
                                    <FontAwesomeIcon icon="users" className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_users}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="check-circle" className="h-6 w-6 text-green-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.verified_users}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="plus" className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">New This Week</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.new_this_week}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="user-shield" className="h-6 w-6 text-purple-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.admin_users}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="clock" className="h-6 w-6 text-orange-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.active_this_month}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Filter Users</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                            <div>
                                <label htmlFor="verified-filter" className="block text-sm font-medium text-gray-700">Verification Status</label>
                                <select 
                                    id="verified-filter"
                                    value={filters.verified}
                                    onChange={(e) => handleFilterChange('verified', e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Users</option>
                                    <option value="1">Verified</option>
                                    <option value="0">Unverified</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="admin-filter" className="block text-sm font-medium text-gray-700">Admin Status</label>
                                <select 
                                    id="admin-filter"
                                    value={filters.is_admin}
                                    onChange={(e) => handleFilterChange('is_admin', e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Users</option>
                                    <option value="1">Admins</option>
                                    <option value="0">Regular Users</option>
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
                                    placeholder="Search by username, email, or display name..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Users</h3>
                            <div className="text-sm text-gray-500">
                                Showing {users.length} of {pagination.total_users} users
                            </div>
                        </div>
                        
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            User
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Login
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stats
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user) => (
                                        <tr key={user.user_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {user.profile_picture_url ? (
                                                            <img className="h-10 w-10 rounded-full" src={user.profile_picture_url} alt="" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                                <FontAwesomeIcon icon="user" className="text-gray-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.display_name || user.username}
                                                        </div>
                                                        <div className="text-sm text-gray-500">@{user.username}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.verified ? 'text-green-800 bg-green-100' : 'text-yellow-800 bg-yellow-100'}`}>
                                                        {user.verified ? 'Verified' : 'Unverified'}
                                                    </span>
                                                    {user.is_admin && (
                                                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-purple-800 bg-purple-100">
                                                            Admin
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(user.join_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(user.last_login)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-4">
                                                    <span title="Sets in collection">
                                                        <FontAwesomeIcon icon="cubes" className="mr-1" />
                                                        {user.total_sets}
                                                    </span>
                                                    <span title="Trophies earned" className="text-yellow-600">
                                                        <FontAwesomeIcon icon="trophy" className="mr-1" />
                                                        {user.total_trophies}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleTrophyManagement(user)}
                                                        className="text-yellow-600 hover:text-yellow-900"
                                                        title="Manage Trophies"
                                                    >
                                                        <FontAwesomeIcon icon="trophy" />
                                                    </button>
                                                    <Link
                                                        to={`/profile/${user.user_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-900"
                                                        title="View Profile"
                                                    >
                                                        <FontAwesomeIcon icon="external-link-alt" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleTrophyManagement(user)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Edit User / Manage Trophies"
                                                    >
                                                        <FontAwesomeIcon icon="edit" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.total_pages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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

                {/* Trophy Management Modal */}
                {showTrophyModal && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Manage Trophies for {selectedUser.display_name || selectedUser.username}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowTrophyModal(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <FontAwesomeIcon icon="times" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {isLoadingTrophies ? (
                                    <div className="flex justify-center items-center py-12">
                                        <FontAwesomeIcon icon="spinner" className="animate-spin text-2xl text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* User's Current Trophies */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Current Trophies ({userTrophies.length})</h4>
                                            {userTrophies.length === 0 ? (
                                                <div className="text-center py-8">
                                                    <FontAwesomeIcon icon="trophy" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                                                    <p className="text-gray-500 text-sm">This user has no trophies yet.</p>
                                                    <p className="text-gray-400 text-xs mt-1">Assign trophies from the available list below.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {userTrophies.map(trophy => (
                                                        <div key={trophy.id} className="border rounded-lg p-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    {trophy.image_path ? (
                                                                        <img src={trophy.image_path} alt={trophy.name} className="w-8 h-8 rounded flex-shrink-0" />
                                                                    ) : (
                                                                        <FontAwesomeIcon icon="trophy" className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                                                                    )}
                                                                    <div className="min-w-0 flex-1">
                                                                        <h5 className="font-medium text-gray-900 truncate">{trophy.name}</h5>
                                                                        <p className="text-sm text-gray-600 line-clamp-2">{trophy.description}</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRarityColor(trophy.rarity)}`}>
                                                                                {trophy.rarity}
                                                                            </span>
                                                                            {trophy.awarded_at && (
                                                                                <span className="text-xs text-gray-500">
                                                                                    Awarded {formatDate(trophy.awarded_at)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRemoveTrophy(trophy.id)}
                                                                    className="text-red-600 hover:text-red-800 ml-2 flex-shrink-0"
                                                                    title="Remove Trophy"
                                                                >
                                                                    <FontAwesomeIcon icon="times" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Available Trophies to Assign */}
                                        <div>
                                            <h4 className="text-md font-medium text-gray-900 mb-3">
                                                Available Trophies ({allTrophies.filter(trophy => !trophy.user_has_trophy).length})
                                            </h4>
                                            {allTrophies.filter(trophy => !trophy.user_has_trophy).length === 0 ? (
                                                <p className="text-gray-500 text-sm">All available trophies have been assigned to this user.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {allTrophies.filter(trophy => !trophy.user_has_trophy).map(trophy => (
                                                        <div key={trophy.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3 flex-1">
                                                                    {trophy.image_path ? (
                                                                        <img src={trophy.image_path} alt={trophy.name} className="w-8 h-8 rounded flex-shrink-0" />
                                                                    ) : (
                                                                        <FontAwesomeIcon icon="trophy" className="w-8 h-8 text-gray-400 flex-shrink-0" />
                                                                    )}
                                                                    <div className="min-w-0 flex-1">
                                                                        <h5 className="font-medium text-gray-900 truncate">{trophy.name}</h5>
                                                                        <p className="text-sm text-gray-600 line-clamp-2">{trophy.description}</p>
                                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRarityColor(trophy.rarity)} mt-1`}>
                                                                            {trophy.rarity}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleAssignTrophy(trophy.id)}
                                                                    className="text-green-600 hover:text-green-800 ml-2 flex-shrink-0"
                                                                    title="Assign Trophy"
                                                                >
                                                                    <FontAwesomeIcon icon="plus" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
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

export default AdminUsers;
