import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const AdminLogs = () => {
    const { user, isLoading: authLoading, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        total_logs: 0,
        todays_logins: 0,
        failed_logins: 0,
        admin_access: 0
    });
    const [pagination, setPagination] = useState({
        total_count: 0,
        limit: 50,
        offset: 0,
        has_more: false
    });
    const [filters, setFilters] = useState({
        log_type: '',
        date_from: '',
        date_to: ''
    });
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
            
            // Load initial logs data
            await loadLogs();
        };

        verifyAdminAccess();
    }, [user, authLoading, checkAdminStatus, navigate]);

    const loadLogs = async (resetOffset = false) => {
        if (!isAuthorized && !user) return;
        
        setIsLoadingLogs(true);
        
        try {
            const currentOffset = resetOffset ? 0 : pagination.offset;
            const params = new URLSearchParams({
                limit: pagination.limit.toString(),
                offset: currentOffset.toString()
            });

            // Add filters if they exist
            if (filters.log_type) params.append('log_type', filters.log_type);
            if (filters.date_from) params.append('date_from', filters.date_from);
            if (filters.date_to) params.append('date_to', filters.date_to);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_get_logs.php?${params}`, {
                method: 'GET',
                credentials: 'include',
            });

            const data = await response.json();

            if (data.success) {
                setLogs(data.logs);
                setPagination(data.pagination);
                setStats(data.stats);
            } else {
                console.error('Error loading logs:', data.error);
                if (data.error === 'Admin access required' || data.error === 'Not authenticated') {
                    navigate('/');
                }
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleFilterSubmit = () => {
        loadLogs(true); // Reset to first page when filtering
    };

    const handleLoadMore = () => {
        setPagination(prev => ({
            ...prev,
            offset: prev.offset + prev.limit
        }));
        // This will trigger a new load with updated offset
        setTimeout(() => loadLogs(), 100);
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    const getLogTypeColor = (logType, logAction) => {
        switch (logType) {
            case 'AUTHENTICATION':
                return logAction.includes('successful') ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100';
            case 'ADMIN':
                return 'text-red-600 bg-red-100';
            case 'USER_MANAGEMENT':
                return 'text-blue-600 bg-blue-100';
            case 'COLLECTION':
                return 'text-purple-600 bg-purple-100';
            case 'SECURITY':
                return 'text-red-600 bg-red-100';
            case 'SYSTEM':
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getLogTypeDisplay = (logType) => {
        switch (logType) {
            case 'AUTHENTICATION': return 'Auth';
            case 'ADMIN': return 'Admin';
            case 'USER_MANAGEMENT': return 'User';
            case 'COLLECTION': return 'Collection';
            case 'SECURITY': return 'Security';
            case 'SYSTEM': return 'System';
            default: return logType;
        }
    };

    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
                            <Link to="/admin" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                                </svg>
                                Admin Dashboard
                            </Link>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                                </svg>
                                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">System Logs</span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
                    <p className="mt-2 text-gray-600">
                        Monitor system activity, user actions, and security events.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Logs</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_logs.toLocaleString()}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Today's Logins</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.todays_logins}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.232 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Failed Logins</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.failed_logins}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Admin Access</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.admin_access}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Log Filters */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Log Filters</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label htmlFor="log-type" className="block text-sm font-medium text-gray-700">Log Type</label>
                                <select 
                                    id="log-type" 
                                    value={filters.log_type}
                                    onChange={(e) => handleFilterChange('log_type', e.target.value)}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Types</option>
                                    <option value="AUTHENTICATION">Authentication</option>
                                    <option value="ADMIN">Admin Access</option>
                                    <option value="USER_MANAGEMENT">User Management</option>
                                    <option value="COLLECTION">Collection Changes</option>
                                    <option value="SECURITY">Security Events</option>
                                    <option value="SYSTEM">System Events</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="date-from" className="block text-sm font-medium text-gray-700">Date From</label>
                                <input 
                                    type="date" 
                                    id="date-from" 
                                    value={filters.date_from}
                                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" 
                                />
                            </div>
                            <div>
                                <label htmlFor="date-to" className="block text-sm font-medium text-gray-700">Date To</label>
                                <input 
                                    type="date" 
                                    id="date-to" 
                                    value={filters.date_to}
                                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                    className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" 
                                />
                            </div>
                            <div className="flex items-end">
                                <button 
                                    onClick={handleFilterSubmit}
                                    disabled={isLoadingLogs}
                                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    {isLoadingLogs ? 'Loading...' : 'Filter Logs'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Log Management Actions</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 4m4 4v12" />
                                </svg>
                                Export Logs
                            </button>
                            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                Generate Report
                            </button>
                            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear Old Logs
                            </button>
                        </div>
                    </div>
                </div>

                {/* Log Table */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">System Activity Log</h3>
                            <div className="text-sm text-gray-500">
                                Showing {logs.length} of {pagination.total_count.toLocaleString()} logs
                            </div>
                        </div>
                        
                        {isLoadingLogs ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading logs...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    No logs match your current filters. Try adjusting your search criteria.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Timestamp
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Type
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    User
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Action
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    IP Address
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {logs.map((log) => (
                                                <tr key={log.log_id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {formatTimestamp(log.log_timestamp)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeColor(log.log_type, log.log_action)}`}>
                                                            {getLogTypeDisplay(log.log_type)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {log.username || (log.log_user ? `User ID: ${log.log_user}` : 'Anonymous')}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900">
                                                        {log.log_action}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {log.log_ip || 'N/A'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {pagination.has_more && (
                                    <div className="mt-6 text-center">
                                        <button 
                                            onClick={handleLoadMore}
                                            disabled={isLoadingLogs}
                                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoadingLogs ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Loading...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0L8 4m4 4v12" />
                                                    </svg>
                                                    Load More Logs
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogs;
