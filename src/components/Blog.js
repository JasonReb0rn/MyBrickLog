import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage, EmptyState } from './CommonUI';
import { useAuth } from './AuthContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const Blog = () => {
    const { user, checkAdminStatus } = useAuth();
    const [posts, setPosts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams] = useSearchParams();
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalPosts: 0,
        postsPerPage: 10
    });
    const [loadedImages, setLoadedImages] = useState({});
    const [isAdmin, setIsAdmin] = useState(false);

    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page')) || 1;

    useEffect(() => {
        fetchBlogData();
    }, [category, page]);

    // Non-blocking admin check
    useEffect(() => {
        const checkAdmin = async () => {
            if (user) {
                try {
                    const adminStatus = await checkAdminStatus();
                    setIsAdmin(adminStatus);
                } catch (error) {
                    console.error('Error checking admin status:', error);
                    setIsAdmin(false);
                }
            } else {
                setIsAdmin(false);
            }
        };
        
        checkAdmin();
    }, [user, checkAdminStatus]);

    const fetchBlogData = async () => {
        setIsLoading(true);
        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (category) params.append('category', category);
            if (page > 1) params.append('page', page.toString());
            
            // Fetch posts and categories in parallel
            const [postsResponse, categoriesResponse] = await Promise.all([
                fetch(`${process.env.REACT_APP_API_URL}/blog_get_posts.php?${params}`),
                fetch(`${process.env.REACT_APP_API_URL}/blog_get_categories.php`)
            ]);

            if (!postsResponse.ok) {
                throw new Error('Failed to fetch posts');
            }
            if (!categoriesResponse.ok) {
                throw new Error('Failed to fetch categories');
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
            setPagination({
                currentPage: postsData.pagination.current_page,
                totalPages: postsData.pagination.total_pages,
                totalPosts: postsData.pagination.total_posts,
                postsPerPage: postsData.pagination.posts_per_page
            });
        } catch (error) {
            console.error('Error fetching blog data:', error);
            setError('Unable to load blog posts. Please try again later.');
        }
        setIsLoading(false);
    };

    const handleImageLoad = (postId) => {
        setLoadedImages(prev => ({ ...prev, [postId]: true }));
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatReadTime = (content = '') => {
        const wordsPerMinute = 200;
        const wordCount = content.split(' ').length;
        const readTime = Math.ceil(wordCount / wordsPerMinute);
        return `${readTime} min read`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <LoadingSpinner text="Loading blog posts..." size="lg" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <ErrorMessage message={error} onRetry={() => fetchBlogData()} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center relative">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            <FontAwesomeIcon icon="comment-dots" className="mr-4" />
                            MyBrickLog Blog
                        </h1>
                        <p className="text-xl text-red-100 max-w-3xl mx-auto mb-6">
                            Stay up to date with the latest LEGO news, reviews, and collection tips from our community.
                        </p>
                        
                        {/* Admin New Post Button */}
                        {isAdmin && (
                            <div className="mt-6">
                                <Link
                                    to="/admin/blog/new"
                                    className="inline-flex items-center px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg font-medium transition-all duration-200 backdrop-blur-sm border border-white border-opacity-30"
                                >
                                    <FontAwesomeIcon icon="plus" className="mr-2" />
                                    Create New Post
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="lg:grid lg:grid-cols-4 lg:gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {/* Category Filter */}
                        {category && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Posts in "{categories.find(c => c.slug === category)?.name || category}"
                                    </h2>
                                    <Link 
                                        to="/blog" 
                                        className="text-red-600 hover:text-red-800 font-medium"
                                    >
                                        <FontAwesomeIcon icon="arrow-left" className="mr-2" />
                                        All Posts
                                    </Link>
                                </div>
                            </div>
                        )}

                        {/* Posts Grid */}
                        {posts.length === 0 ? (
                            <EmptyState 
                                message="No blog posts found."
                                actionText="View All Posts"
                                onAction={() => window.location.href = '/blog'}
                                icon="newspaper"
                            />
                        ) : (
                            <div className="space-y-8">
                                {posts.map((post, index) => (
                                    <article 
                                        key={post.id}
                                        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 ${
                                            index === 0 && !category ? 'lg:flex' : ''
                                        }`}
                                    >
                                        {/* Featured Image */}
                                        <div className={`${index === 0 && !category ? 'lg:w-1/2' : 'w-full h-48'} relative overflow-hidden`}>
                                            {!loadedImages[post.id] && (
                                                <Skeleton height={index === 0 && !category ? 300 : 192} />
                                            )}
                                            <img
                                                src={post.featured_image || '/images/lego_piece_questionmark.png'}
                                                alt={post.title}
                                                className={`w-full h-full object-cover ${loadedImages[post.id] ? 'opacity-100' : 'opacity-0'}`}
                                                onLoad={() => handleImageLoad(post.id)}
                                                onError={(e) => {
                                                    e.target.src = '/images/lego_piece_questionmark.png';
                                                }}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className={`p-6 ${index === 0 && !category ? 'lg:w-1/2' : ''}`}>
                                            {/* Category and Date */}
                                            <div className="flex items-center gap-4 mb-3">
                                                <Link
                                                    to={`/blog?category=${post.category.slug}`}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                                >
                                                    {post.category.name}
                                                </Link>
                                                <span className="text-sm text-gray-500">
                                                    {formatDate(post.published_at)}
                                                </span>
                                            </div>

                                            {/* Title */}
                                            <h2 className={`font-bold text-gray-900 mb-3 hover:text-red-600 transition-colors ${
                                                index === 0 && !category ? 'text-2xl lg:text-3xl' : 'text-xl'
                                            }`}>
                                                <Link to={`/blog/${post.slug}`}>
                                                    {post.title}
                                                </Link>
                                            </h2>

                                            {/* Excerpt */}
                                            <p className="text-gray-600 mb-4 line-clamp-3">
                                                {post.excerpt}
                                            </p>

                                            {/* Tags */}
                                            {post.tags && post.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {post.tags.map(tag => (
                                                        <span 
                                                            key={tag.id}
                                                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                                                        >
                                                            <FontAwesomeIcon icon="tag" className="mr-1 text-gray-500" />
                                                            {tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Meta Info */}
                                            <div className="flex items-center justify-between text-sm text-gray-500">
                                                <div className="flex items-center gap-4">
                                                    <span>
                                                        <FontAwesomeIcon icon="user" className="mr-1" />
                                                        {post.author.username}
                                                    </span>
                                                    <span>
                                                        <FontAwesomeIcon icon="eye" className="mr-1" />
                                                        {post.view_count} views
                                                    </span>
                                                    <span>
                                                        <FontAwesomeIcon icon="clock" className="mr-1" />
                                                        {formatReadTime(post.content)}
                                                    </span>
                                                </div>
                                                <Link 
                                                    to={`/blog/${post.slug}`}
                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                >
                                                    Read More
                                                    <FontAwesomeIcon icon="arrow-right" className="ml-2" />
                                                </Link>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="mt-8 flex justify-center">
                                <nav className="flex items-center gap-2">
                                    {pagination.currentPage > 1 && (
                                        <Link
                                            to={`/blog${category ? `?category=${category}` : ''}${pagination.currentPage > 2 ? `${category ? '&' : '?'}page=${pagination.currentPage - 1}` : ''}`}
                                            className="px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        >
                                            <FontAwesomeIcon icon="chevron-left" />
                                        </Link>
                                    )}
                                    
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                                        <Link
                                            key={pageNum}
                                            to={`/blog${category ? `?category=${category}` : ''}${pageNum > 1 ? `${category ? '&' : '?'}page=${pageNum}` : ''}`}
                                            className={`px-3 py-2 rounded-md ${
                                                pageNum === pagination.currentPage
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {pageNum}
                                        </Link>
                                    ))}
                                    
                                    {pagination.currentPage < pagination.totalPages && (
                                        <Link
                                            to={`/blog${category ? `?category=${category}` : ''}?page=${pagination.currentPage + 1}`}
                                            className="px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        >
                                            <FontAwesomeIcon icon="chevron-right" />
                                        </Link>
                                    )}
                                </nav>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="mt-8 lg:mt-0">
                        {/* Categories */}
                        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                <FontAwesomeIcon icon="folder" className="mr-2 text-red-600" />
                                Categories
                            </h3>
                            <ul className="space-y-2">
                                <li>
                                    <Link
                                        to="/blog"
                                        className={`block px-3 py-2 rounded-md transition-colors ${
                                            !category 
                                                ? 'bg-red-100 text-red-800' 
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        All Posts
                                    </Link>
                                </li>
                                {categories.map(cat => (
                                    <li key={cat.id}>
                                        <Link
                                            to={`/blog?category=${cat.slug}`}
                                            className={`flex justify-between items-center px-3 py-2 rounded-md transition-colors ${
                                                category === cat.slug 
                                                    ? 'bg-red-100 text-red-800' 
                                                    : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                        >
                                            <span>{cat.name}</span>
                                            <span className="text-sm text-gray-500">({cat.count})</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Recent Posts */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                <FontAwesomeIcon icon="clock" className="mr-2 text-red-600" />
                                Recent Posts
                            </h3>
                            <div className="space-y-3">
                                {posts.slice(0, 3).map(post => (
                                    <div key={post.id} className="flex gap-3">
                                        <img
                                            src={post.featured_image || '/images/lego_piece_questionmark.png'}
                                            alt={post.title}
                                            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                                <Link to={`/blog/${post.slug}`} className="hover:text-red-600">
                                                    {post.title}
                                                </Link>
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {formatDate(post.published_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Blog;
