import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage } from './CommonUI';
import axios from 'axios';

const AdminBlogEditor = () => {
    const { user, isLoading: authLoading, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const { postId } = useParams();
    const isEditing = !!postId;
    
    // Use refs to prevent unnecessary re-renders
    const authCheckRef = useRef(false);
    const formPersistenceKey = useMemo(() => `blog_editor_form_${postId || 'new'}`, [postId]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    
    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        content: '',
        excerpt: '',
        category_id: '',
        featured_image: '',
        status: 'draft',
        meta_title: '',
        meta_description: '',
        tags: []
    });

    const [newTag, setNewTag] = useState('');
    const [showImageBrowser, setShowImageBrowser] = useState(false);
    const [uploadedImages, setUploadedImages] = useState([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);

    // Form persistence - save to localStorage on changes
    const persistFormData = useCallback((data) => {
        try {
            localStorage.setItem(formPersistenceKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to persist form data:', error);
        }
    }, [formPersistenceKey]);

    // Load persisted form data
    const loadPersistedFormData = useCallback(() => {
        try {
            const persisted = localStorage.getItem(formPersistenceKey);
            return persisted ? JSON.parse(persisted) : null;
        } catch (error) {
            console.warn('Failed to load persisted form data:', error);
            return null;
        }
    }, [formPersistenceKey]);

    // Clear persisted form data
    const clearPersistedFormData = useCallback(() => {
        try {
            localStorage.removeItem(formPersistenceKey);
        } catch (error) {
            console.warn('Failed to clear persisted form data:', error);
        }
    }, [formPersistenceKey]);

    // Memoized admin verification to prevent unnecessary re-runs
    const verifyAdminAccess = useCallback(async () => {
        if (authLoading || authCheckRef.current) return;
        
        if (!user) {
            navigate('/');
            return;
        }

        try {
            authCheckRef.current = true;
            const isAdmin = await checkAdminStatus();
            if (!isAdmin) {
                navigate('/');
                return;
            }

            setIsAuthorized(true);
            await loadEditorData();
        } finally {
            authCheckRef.current = false;
        }
    }, [user, authLoading, checkAdminStatus, navigate]);

    useEffect(() => {
        verifyAdminAccess();
    }, [verifyAdminAccess]);

    // Memoized data loading function
    const loadEditorData = useCallback(async () => {
        try {
            // Fetch categories and tags in parallel
            console.log('Fetching categories and tags...');
            const categoriesResponse = await fetch(`${process.env.REACT_APP_API_URL}/blog_get_categories.php`, {
                credentials: 'include'
            });
            const tagsResponse = await fetch(`${process.env.REACT_APP_API_URL}/blog_get_tags.php`, {
                credentials: 'include'
            });

            console.log('Categories response status:', categoriesResponse.status);
            console.log('Tags response status:', tagsResponse.status);

            if (!categoriesResponse.ok) {
                throw new Error(`Failed to fetch categories (${categoriesResponse.status})`);
            }
            if (!tagsResponse.ok) {
                throw new Error(`Failed to fetch tags (${tagsResponse.status})`);
            }

            const categoriesData = await categoriesResponse.json();
            const tagsData = await tagsResponse.json();

            console.log('Categories data:', categoriesData);
            console.log('Tags data:', tagsData);

            if (!categoriesData.success) {
                throw new Error(categoriesData.message || 'Failed to load categories');
            }
            if (!tagsData.success) {
                throw new Error(tagsData.message || 'Failed to load tags');
            }

            setCategories(categoriesData.categories || []);
            setTags(tagsData.tags || []);

            // If editing, fetch the post data
            if (isEditing) {
                console.log('Fetching post data for ID:', postId);
                const postResponse = await fetch(`${process.env.REACT_APP_API_URL}/admin_blog_get_post.php?id=${postId}`, {
                    credentials: 'include'
                });

                console.log('Post response status:', postResponse.status);

                if (!postResponse.ok) {
                    throw new Error(`Failed to fetch post data (${postResponse.status})`);
                }

                const postData = await postResponse.json();
                console.log('Post data:', postData);

                if (!postData.success) {
                    throw new Error(postData.message || 'Failed to load post');
                }

                const post = postData.post;
                const newFormData = {
                    title: post.title,
                    slug: post.slug,
                    content: post.content,
                    excerpt: post.excerpt || '',
                    category_id: post.category_id.toString(),
                    featured_image: post.featured_image || '',
                    status: post.status,
                    meta_title: post.meta_title || '',
                    meta_description: post.meta_description || '',
                    tags: post.tags || []
                };
                setFormData(newFormData);
                // Clear any persisted data when loading existing post
                clearPersistedFormData();
            } else {
                // For new posts, try to load persisted data
                const persistedData = loadPersistedFormData();
                if (persistedData) {
                    setFormData(persistedData);
                    console.log('Loaded persisted form data');
                }
            }
        } catch (error) {
            console.error('Error loading editor data:', error);
            setError(`Unable to load editor data: ${error.message}. Please check the console for more details.`);
        }
        setIsLoading(false);
    }, [isEditing, postId, loadPersistedFormData, clearPersistedFormData]);

    const generateSlug = useCallback((title) => {
        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }, []);

    // Memoized form update function with persistence
    const handleInputChange = useCallback((field, value) => {
        setFormData(prev => {
            const newFormData = { ...prev, [field]: value };
            
            // Persist form data to localStorage (debounced to avoid excessive writes)
            if (!isEditing) {
                persistFormData(newFormData);
            }
            
            return newFormData;
        });
    }, [isEditing, persistFormData]);

    const handleAddTag = useCallback(() => {
        if (!newTag.trim()) return;

        const tagName = newTag.trim();
        const existingTag = tags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());

        if (existingTag) {
            setFormData(prev => {
                if (!prev.tags.includes(existingTag.id)) {
                    const newFormData = { ...prev, tags: [...prev.tags, existingTag.id] };
                    if (!isEditing) {
                        persistFormData(newFormData);
                    }
                    return newFormData;
                }
                return prev;
            });
        } else {
            // Create new tag (in real app, this would create it in the database)
            const newTagObj = {
                id: Date.now(),
                name: tagName,
                slug: generateSlug(tagName)
            };
            setTags(prev => [...prev, newTagObj]);
            setFormData(prev => {
                const newFormData = { ...prev, tags: [...prev.tags, newTagObj.id] };
                if (!isEditing) {
                    persistFormData(newFormData);
                }
                return newFormData;
            });
        }

        setNewTag('');
    }, [newTag, tags, generateSlug, isEditing, persistFormData]);

    const handleRemoveTag = useCallback((tagId) => {
        setFormData(prev => {
            const newFormData = { ...prev, tags: prev.tags.filter(id => id !== tagId) };
            if (!isEditing) {
                persistFormData(newFormData);
            }
            return newFormData;
        });
    }, [isEditing, persistFormData]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        // Get current form data at submission time
        setFormData(currentFormData => {
            (async () => {
                try {
                    // Validate required fields
                    if (!currentFormData.title.trim()) {
                        throw new Error('Title is required');
                    }
                    if (!currentFormData.content.trim()) {
                        throw new Error('Content is required');
                    }
                    if (!currentFormData.category_id) {
                        throw new Error('Category is required');
                    }

                    // Prepare data for submission
                    const submitData = {
                        ...currentFormData,
                        category_id: parseInt(currentFormData.category_id),
                        tags: currentFormData.tags.map(tagId => {
                            const tag = tags.find(t => t.id === tagId);
                            return tag ? tag.name : '';
                        }).filter(name => name)
                    };

                    if (isEditing) {
                        submitData.id = parseInt(postId);
                    }

                    const response = await fetch(`${process.env.REACT_APP_API_URL}/admin_blog_save_post.php`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify(submitData)
                    });

                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        throw new Error(data.message || 'Failed to save post');
                    }

                    // Clear persisted form data on successful save
                    clearPersistedFormData();
                    
                    // Redirect to blog management
                    navigate('/admin/blog');
                } catch (error) {
                    console.error('Error saving post:', error);
                    setError(error.message || 'Failed to save post. Please try again.');
                } finally {
                    setIsSaving(false);
                }
            })();
            
            return currentFormData; // Return unchanged form data
        });
    }, [tags, isEditing, postId, clearPersistedFormData, navigate]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 25 * 1024 * 1024; // 25MB

        if (!allowedTypes.includes(file.type)) {
            setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
            return;
        }

        if (file.size > maxSize) {
            const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
            setError(`File too large (${sizeMB}MB). Maximum size is 25MB. Try compressing your image or using a smaller resolution.`);
            return;
        }

        // Check image dimensions if it's a very large image
        if (file.size > 10 * 1024 * 1024) { // If larger than 10MB, check dimensions
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = function() {
                URL.revokeObjectURL(objectUrl);
                if (this.width > 4000 || this.height > 4000) {
                    setError(`Image resolution is very high (${this.width}x${this.height}). Consider resizing to under 4000x4000 pixels for better performance.`);
                    return;
                }
                // If dimensions are OK, continue with upload
                proceedWithUpload();
            };
            
            img.onerror = function() {
                URL.revokeObjectURL(objectUrl);
                setError('Unable to read image file. Please try a different image.');
                return;
            };
            
            img.src = objectUrl;
            return; // Exit here, let the image load handler continue
        }

        // If we get here, proceed with upload
        proceedWithUpload();

        async function proceedWithUpload() {
            setError(null);
            
            try {
                const uploadFormData = new FormData();
                uploadFormData.append('image', file);


                const response = await axios.post(
                    `${process.env.REACT_APP_API_URL}/blog_upload_image.php`,
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

                // Update the featured image URL
                handleInputChange('featured_image', response.data.image.url);

            } catch (error) {
                console.error('Error uploading image:', error);
                if (error.response && error.response.data) {
                    const errorMsg = error.response.data.error || error.response.data.message || error.message;
                    const details = error.response.data.details || '';
                    setError(`Failed to upload image: ${errorMsg}${details ? ` (${details})` : ''}`);
                } else {
                    setError(`Failed to upload image: ${error.message}`);
                }
            }
        }
    };

    const loadUploadedImages = useCallback(async () => {
        setIsLoadingImages(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/blog_get_images.php?limit=20`, {
                credentials: 'include'
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to load images');
            }

            setUploadedImages(data.images);
        } catch (error) {
            console.error('Error loading images:', error);
            setError(`Failed to load images: ${error.message}`);
        }
        setIsLoadingImages(false);
    }, []);

    const handleSelectImage = useCallback((imageUrl) => {
        handleInputChange('featured_image', imageUrl);
        setShowImageBrowser(false);
    }, [handleInputChange]);

    if (isLoading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading editor...</p>
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
                                <Link to="/admin/blog" className="ml-1 text-sm font-medium text-gray-700 hover:text-red-600 md:ml-2">
                                    Blog Management
                                </Link>
                            </div>
                        </li>
                        <li>
                            <div className="flex items-center">
                                <FontAwesomeIcon icon="chevron-right" className="w-6 h-6 text-gray-400" />
                                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                                    {isEditing ? 'Edit Post' : 'New Post'}
                                </span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {isEditing ? 'Edit Blog Post' : 'Create New Blog Post'}
                        </h1>
                        <p className="mt-2 text-gray-600">
                            {isEditing ? 'Update your blog post content and settings.' : 'Create a new blog post for your community.'}
                        </p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6">
                        <ErrorMessage message={error} onRetry={() => setError(null)} />
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Title */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <div className="mb-4">
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => handleInputChange('title', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Enter post title..."
                                        required
                                    />
                                </div>

                                <div className="mb-4">
                                    <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                                        Slug
                                    </label>
                                    <div className="flex">
                                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                            /blog/
                                        </span>
                                        <input
                                            type="text"
                                            id="slug"
                                            value={formData.slug}
                                            onChange={(e) => handleInputChange('slug', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="post-slug"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange('slug', generateSlug(formData.title))}
                                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 transition-colors border border-l-0 border-gray-300"
                                            title="Generate slug from title"
                                        >
                                            <FontAwesomeIcon icon="sync" />
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
                                        Excerpt
                                    </label>
                                    <textarea
                                        id="excerpt"
                                        value={formData.excerpt}
                                        onChange={(e) => handleInputChange('excerpt', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                        placeholder="Brief description of the post..."
                                    />
                                </div>
                            </div>

                            {/* Content Editor */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                                    Content *
                                </label>
                                <textarea
                                    id="content"
                                    value={formData.content}
                                    onChange={(e) => handleInputChange('content', e.target.value)}
                                    rows={20}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none font-mono text-sm"
                                    placeholder="Write your blog post content here... (HTML supported)"
                                    required
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    You can use HTML tags for formatting. A rich text editor will be added in a future update.
                                </p>
                            </div>

                            {/* SEO Settings */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">SEO Settings</h3>
                                
                                <div className="mb-4">
                                    <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700 mb-2">
                                        Meta Title
                                    </label>
                                    <input
                                        type="text"
                                        id="meta_title"
                                        value={formData.meta_title}
                                        onChange={(e) => handleInputChange('meta_title', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="SEO title for search engines..."
                                        maxLength={60}
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        {formData.meta_title.length}/60 characters
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700 mb-2">
                                        Meta Description
                                    </label>
                                    <textarea
                                        id="meta_description"
                                        value={formData.meta_description}
                                        onChange={(e) => handleInputChange('meta_description', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                        placeholder="SEO description for search engines..."
                                        maxLength={160}
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        {formData.meta_description.length}/160 characters
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            {/* Publish Settings */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Publish</h3>
                                
                                <div className="mb-4">
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <select
                                        id="status"
                                        value={formData.status}
                                        onChange={(e) => handleInputChange('status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    >
                                        <option value="draft">Draft</option>
                                        <option value="published">Published</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>

                                <div className="mb-6">
                                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                        Category *
                                    </label>
                                    <select
                                        id="category"
                                        value={formData.category_id}
                                        onChange={(e) => handleInputChange('category_id', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select a category</option>
                                        {categories.map(category => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3">
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
                                            isEditing ? 'Update Post' : 'Create Post'
                                        )}
                                    </button>
                                    <Link
                                        to="/admin/blog"
                                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-center"
                                    >
                                        Cancel
                                    </Link>
                                </div>
                            </div>

                            {/* Featured Image */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Featured Image</h3>
                                
                                {formData.featured_image && (
                                    <div className="mb-4">
                                        <img
                                            src={formData.featured_image}
                                            alt="Featured"
                                            className="w-full h-32 object-cover rounded-md"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleInputChange('featured_image', '')}
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
                                </div>

                                <div className="mb-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowImageBrowser(true);
                                            loadUploadedImages();
                                        }}
                                        className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                                    >
                                        <FontAwesomeIcon icon="images" className="mr-2" />
                                        Choose from Uploaded Images
                                    </button>
                                </div>

                                <div>
                                    <label htmlFor="featured_image_url" className="block text-sm font-medium text-gray-700 mb-2">
                                        Or enter URL
                                    </label>
                                    <input
                                        type="url"
                                        id="featured_image_url"
                                        value={formData.featured_image}
                                        onChange={(e) => handleInputChange('featured_image', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Tags</h3>
                                
                                {/* Selected Tags */}
                                {formData.tags.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-2">
                                            {formData.tags.map(tagId => {
                                                const tag = tags.find(t => t.id === tagId);
                                                return tag ? (
                                                    <span
                                                        key={tagId}
                                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                                                    >
                                                        {tag.name}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveTag(tagId)}
                                                            className="ml-2 text-red-600 hover:text-red-800"
                                                        >
                                                            <FontAwesomeIcon icon="times" />
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Add Tag */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        placeholder="Add tag..."
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                                    >
                                        <FontAwesomeIcon icon="plus" />
                                    </button>
                                </div>

                                {/* Popular Tags */}
                                <div className="mt-4">
                                    <p className="text-sm text-gray-600 mb-2">Popular tags:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.filter(tag => !formData.tags.includes(tag.id)).slice(0, 5).map(tag => (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => handleInputChange('tags', [...formData.tags, tag.id])}
                                                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                            >
                                                {tag.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Image Browser Modal */}
                {showImageBrowser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-gray-900">Choose Image</h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowImageBrowser(false)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <FontAwesomeIcon icon="times" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                                {isLoadingImages ? (
                                    <div className="flex justify-center items-center py-12">
                                        <FontAwesomeIcon icon="spinner" className="animate-spin text-2xl text-gray-400" />
                                    </div>
                                ) : uploadedImages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FontAwesomeIcon icon="image" className="text-4xl text-gray-300 mb-4" />
                                        <p className="text-gray-500">No images uploaded yet.</p>
                                        <p className="text-sm text-gray-400 mt-2">Upload an image using the file input above.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {uploadedImages.map(image => (
                                            <div
                                                key={image.id}
                                                className="cursor-pointer group"
                                                onClick={() => handleSelectImage(image.url)}
                                            >
                                                <div className="aspect-square overflow-hidden rounded-md border-2 border-transparent group-hover:border-red-500 transition-colors">
                                                    <img
                                                        src={image.url}
                                                        alt={image.original_filename}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                </div>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-900 truncate" title={image.original_filename}>
                                                        {image.original_filename}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {image.file_size_formatted} • {new Date(image.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
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

export default AdminBlogEditor;
