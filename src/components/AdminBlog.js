import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage } from './CommonUI';

const AdminBlog = () => {
    const { user, isLoading: authLoading, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState({
        total_posts: 0,
        published_posts: 0,
        draft_posts: 0,
        total_comments: 0,
        pending_comments: 0
    });
    const [filters, setFilters] = useState({
        status: '',
        category: '',
        author: ''
    });

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
            await loadBlogData();
        };

        verifyAdminAccess();
    }, [user, authLoading, checkAdminStatus, navigate]);

    // Reload data when filters change
    useEffect(() => {
        if (isAuthorized) {
            loadBlogData();
        }
    }, [filters, isAuthorized]);

    const loadBlogData = async () => {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.category) params.append('category', filters.category);
            if (filters.author) params.append('author', filters.author);
            
            // Fetch posts and categories in parallel
            const [postsResponse, categoriesResponse] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_URL}/admin_blog_get_posts.php?${params}`, {
                    credentials: 'include'
                }),
                fetch(`${process.env.REACT_APP_API_URL}/blog_get_categories.php`, {
                    credentials: 'include'
                })
            ]);

            if (!postsResponse.ok || !categoriesResponse.ok) {
                throw new Error('Failed to fetch blog data');
            }

            const postsData = await postsResponse.json();
            const categoriesData = await categoriesResponse.json();

            if (!postsData.success) {
                throw new Error(postsData.message || 'Failed to load posts');
            }
            if (!categoriesData.success) {
                throw new Error(categoriesData.message || 'Failed to load categories');
            }

            setPosts(postsData.posts);
            setCategories(categoriesData.categories);
            setStats(postsData.stats);
        } catch (error) {
            console.error('Error loading blog data:', error);
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_blog_delete_post.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ id: postId })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete post');
            }

            // Remove post from UI
            setPosts(prev => prev.filter(post => post.id !== postId));
            // Update stats
            setStats(prev => ({
                ...prev,
                total_posts: prev.total_posts - 1
            }));
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Failed to delete post. Please try again.');
        }
    };

    const handleStatusChange = async (postId, newStatus) => {
        try {
            // Find the current post
            const currentPost = posts.find(post => post.id === postId);
            if (!currentPost) return;

            const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_blog_save_post.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    id: postId,
                    title: currentPost.title,
                    slug: currentPost.slug,
                    content: currentPost.content || '',
                    excerpt: currentPost.excerpt || '',
                    category_id: currentPost.category.id,
                    featured_image: currentPost.featured_image || '',
                    status: newStatus,
                    meta_title: currentPost.meta_title || '',
                    meta_description: currentPost.meta_description || '',
                    tags: []
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update post status');
            }

            // Update post in UI
            setPosts(prev => prev.map(post => 
                post.id === postId 
                    ? { 
                        ...post, 
                        status: newStatus,
                        published_at: newStatus === 'published' ? new Date().toISOString() : post.published_at
                    }
                    : post
            ));
        } catch (error) {
            console.error('Error updating post status:', error);
            alert('Failed to update post status. Please try again.');
        }
    };


    const formatDate = (dateString) => {
        if (!dateString) return 'Not published';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'published':
                return 'text-green-600 bg-green-100';
            case 'draft':
                return 'text-yellow-600 bg-yellow-100';
            case 'archived':
                return 'text-gray-600 bg-gray-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const filteredPosts = posts.filter(post => {
        if (filters.status && post.status !== filters.status) return false;
        if (filters.category && post.category.id !== parseInt(filters.category)) return false;
        if (filters.author && post.author.user_id !== parseInt(filters.author)) return false;
        return true;
    });

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
                                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Blog Management</span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Blog Management</h1>
                        <p className="mt-2 text-gray-600">
                            Manage blog posts, categories, and comments.
                        </p>
                    </div>
                    <Link 
                        to="/admin/blog/new"
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 hover:text-white transition-colors"
                    >
                        <FontAwesomeIcon icon="plus" className="mr-2" />
                        New Post
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="newspaper" className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Total Posts</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_posts}</dd>
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
                                        <dt className="text-sm font-medium text-gray-500 truncate">Published</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.published_posts}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="edit" className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Drafts</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.draft_posts}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow rounded-lg">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <FontAwesomeIcon icon="comments" className="h-6 w-6 text-purple-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Comments</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.total_comments}</dd>
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
                                        <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                                        <dd className="text-lg font-medium text-gray-900">{stats.pending_comments}</dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Link 
                                to="/admin/blog/new"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 hover:text-white"
                            >
                                <FontAwesomeIcon icon="plus" className="mr-2" />
                                New Post
                            </Link>
                            <Link 
                                to="/admin/blog/categories"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 hover:text-white"
                            >
                                <FontAwesomeIcon icon="folder" className="mr-2" />
                                Manage Categories
                            </Link>
                            <Link 
                                to="/admin/blog/comments"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 hover:text-white"
                            >
                                <FontAwesomeIcon icon="comments" className="mr-2" />
                                Moderate Comments
                            </Link>
                            <button 
                                onClick={() => window.open('/admin/blog/new', '_blank')}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 hover:text-white"
                            >
                                <FontAwesomeIcon icon="image" className="mr-2" />
                                Upload Images
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Filter Posts</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
                                <select 
                                    id="status-filter"
                                    value={filters.status}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="published">Published</option>
                                    <option value="draft">Draft</option>
                                    <option value="archived">Archived</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700">Category</label>
                                <select 
                                    id="category-filter"
                                    value={filters.category}
                                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="author-filter" className="block text-sm font-medium text-gray-700">Author</label>
                                <select 
                                    id="author-filter"
                                    value={filters.author}
                                    onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md"
                                >
                                    <option value="">All Authors</option>
                                    <option value="1">Jason</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Posts Table */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">Blog Posts</h3>
                            <div className="text-sm text-gray-500">
                                Showing {filteredPosts.length} of {posts.length} posts
                            </div>
                        </div>
                        
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Title
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Author
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Category
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Published
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
                                    {filteredPosts.map((post) => (
                                        <tr key={post.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    <Link 
                                                        to={`/blog/${post.slug}`}
                                                        className="hover:text-red-600"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        {post.title}
                                                    </Link>
                                                </div>
                                                <div className="text-sm text-gray-500">/{post.slug}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {post.author.username}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {post.category.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <select
                                                    value={post.status}
                                                    onChange={(e) => handleStatusChange(post.id, e.target.value)}
                                                    className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${getStatusColor(post.status)}`}
                                                >
                                                    <option value="draft">Draft</option>
                                                    <option value="published">Published</option>
                                                    <option value="archived">Archived</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(post.published_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center gap-4">
                                                    <span>
                                                        <FontAwesomeIcon icon="eye" className="mr-1" />
                                                        {post.view_count}
                                                    </span>
                                                    <span>
                                                        <FontAwesomeIcon icon="comments" className="mr-1" />
                                                        {post.comment_count}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        to={`/admin/blog/edit/${post.id}`}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <FontAwesomeIcon icon="edit" />
                                                    </Link>
                                                    <Link
                                                        to={`/blog/${post.slug}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        <FontAwesomeIcon icon="external-link-alt" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                    >
                                                        <FontAwesomeIcon icon="trash" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBlog;
