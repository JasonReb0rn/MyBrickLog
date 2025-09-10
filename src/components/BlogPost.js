import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { LoadingSpinner, ErrorMessage } from './CommonUI';

const BlogPost = () => {
    const { slug } = useParams();
    const { user, checkAdminStatus } = useAuth();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [relatedPosts, setRelatedPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetchBlogPost();
    }, [slug]);

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

    const fetchBlogPost = async () => {
        setIsLoading(true);
        try {
            // Fetch post data
            const postResponse = await fetch(`${process.env.REACT_APP_API_URL}/blog_get_post.php?slug=${encodeURIComponent(slug)}`);
            
            if (!postResponse.ok) {
                if (postResponse.status === 404) {
                    setError('Blog post not found.');
                } else {
                    setError('Unable to load blog post. Please try again later.');
                }
                setIsLoading(false);
                return;
            }

            const postData = await postResponse.json();

            if (!postData.success) {
                setError(postData.message || 'Unable to load blog post.');
                setIsLoading(false);
                return;
            }

            setPost(postData.post);
            setRelatedPosts(postData.related_posts || []);

            // Fetch comments for this post
            const commentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/blog_get_comments.php?post_id=${postData.post.id}`);
            
            if (commentsResponse.ok) {
                const commentsData = await commentsResponse.json();
                if (commentsData.success) {
                    setComments(commentsData.comments);
                }
            }
            
        } catch (error) {
            console.error('Error fetching blog post:', error);
            setError('Unable to load blog post. Please try again later.');
        }
        setIsLoading(false);
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            navigate('/login');
            return;
        }

        if (!newComment.trim()) return;

        setIsSubmittingComment(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/blog_add_comment.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    post_id: post.id,
                    content: newComment,
                    parent_id: replyTo
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to submit comment');
            }

            // Add the new comment to the UI
            const newCommentData = data.comment;

            if (replyTo) {
                // Add as reply
                setComments(prev => prev.map(comment => {
                    if (comment.id === replyTo) {
                        return {
                            ...comment,
                            replies: [...comment.replies, newCommentData]
                        };
                    }
                    return comment;
                }));
                setReplyTo(null);
            } else {
                // Add as top-level comment with empty replies array
                setComments(prev => [...prev, { ...newCommentData, replies: [] }]);
            }

            setNewComment('');
        } catch (error) {
            console.error('Error submitting comment:', error);
            setError('Failed to submit comment. Please try again.');
        }
        setIsSubmittingComment(false);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatReadTime = (content = '') => {
        const wordsPerMinute = 200;
        const wordCount = content.replace(/<[^>]*>/g, '').split(' ').length;
        const readTime = Math.ceil(wordCount / wordsPerMinute);
        return `${readTime} min read`;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <LoadingSpinner text="Loading blog post..." size="lg" />
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <ErrorMessage 
                        message={error || 'Blog post not found.'} 
                        onRetry={() => fetchBlogPost()} 
                    />
                    <div className="mt-6 text-center">
                        <Link 
                            to="/blog" 
                            className="text-red-600 hover:text-red-800 font-medium"
                        >
                            <FontAwesomeIcon icon="arrow-left" className="mr-2" />
                            Back to Blog
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Breadcrumb */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <nav className="flex items-center space-x-2 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
                        <FontAwesomeIcon icon="chevron-right" className="text-gray-400" />
                        <Link to="/blog" className="text-gray-500 hover:text-gray-700">Blog</Link>
                        <FontAwesomeIcon icon="chevron-right" className="text-gray-400" />
                        <span className="text-gray-900 truncate">{post.title}</span>
                    </nav>
                </div>
            </div>

            <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Article Header */}
                <header className="mb-8">
                    {/* Category and Date */}
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            to={`/blog?category=${post.category.slug}`}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                        >
                            {post.category.name}
                        </Link>
                        <span className="text-gray-500">
                            {formatDate(post.published_at)}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {post.title}
                    </h1>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                            <span>
                                <FontAwesomeIcon icon="user" className="mr-1" />
                                By {post.author.username}
                            </span>
                            <span>
                                <FontAwesomeIcon icon="clock" className="mr-1" />
                                {formatReadTime(post.content)}
                            </span>
                            <span>
                                <FontAwesomeIcon icon="eye" className="mr-1" />
                                {post.view_count} views
                            </span>
                        </div>
                        
                        {/* Admin Edit Button */}
                        {isAdmin && (
                            <Link
                                to={`/admin/blog/edit/${post.id}`}
                                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium"
                            >
                                <FontAwesomeIcon icon="edit" className="mr-2" />
                                Edit Post
                            </Link>
                        )}
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            {post.tags.map(tag => (
                                <span 
                                    key={tag.id}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                                >
                                    <FontAwesomeIcon icon="tag" className="mr-1 text-gray-500" />
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                {/* Featured Image */}
                {post.featured_image && (
                    <div className="mb-8">
                        <img
                            src={post.featured_image}
                            alt={post.title}
                            className="w-full h-64 md:h-96 object-cover rounded-lg shadow-md"
                            onError={(e) => {
                                e.target.src = '/images/lego_piece_questionmark.png';
                            }}
                        />
                    </div>
                )}

                {/* Article Content */}
                <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                    <div 
                        className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                    />
                </div>

                {/* Social Share */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Share this post</h3>
                    <div className="flex gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                            <FontAwesomeIcon icon={['fab', 'twitter']} />
                            Twitter
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors">
                            <FontAwesomeIcon icon={['fab', 'facebook']} />
                            Facebook
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors">
                            <FontAwesomeIcon icon="link" />
                            Copy Link
                        </button>
                    </div>
                </div>

                {/* Comments Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">
                        Comments ({comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)})
                    </h3>

                    {/* Comment Form */}
                    {user ? (
                        <form onSubmit={handleCommentSubmit} className="mb-8">
                            {replyTo && (
                                <div className="mb-4 p-3 bg-gray-100 rounded-md">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                            Replying to comment
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setReplyTo(null)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <FontAwesomeIcon icon="times" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-4">
                                <img
                                    src={user.profile_picture ? `https://mybricklog.s3.us-east-2.amazonaws.com/profile-pictures/${user.profile_picture}` : '/images/lego_user.png'}
                                    alt={user.username}
                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                />
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Write a comment..."
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                        rows="3"
                                        required
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isSubmittingComment || !newComment.trim()}
                                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {isSubmittingComment ? (
                                                <>
                                                    <FontAwesomeIcon icon="spinner" className="animate-spin mr-2" />
                                                    Posting...
                                                </>
                                            ) : (
                                                replyTo ? 'Post Reply' : 'Post Comment'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="mb-8 p-4 bg-gray-50 rounded-md text-center">
                            <p className="text-gray-600 mb-3">You must be logged in to comment.</p>
                            <Link 
                                to="/login" 
                                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                <FontAwesomeIcon icon="user" className="mr-2" />
                                Sign In to Comment
                            </Link>
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-6">
                        {comments.map(comment => (
                            <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                                <div className="flex gap-4">
                                    <img
                                        src={'/images/lego_user.png'}
                                        alt={comment.author.username}
                                        className="w-10 h-10 rounded-full flex-shrink-0"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-medium text-gray-900">
                                                {comment.author.username}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {formatDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 mb-3">{comment.content}</p>
                                        {user && (
                                            <button
                                                onClick={() => setReplyTo(comment.id)}
                                                className="text-sm text-red-600 hover:text-red-800 font-medium"
                                            >
                                                <FontAwesomeIcon icon="reply" className="mr-1" />
                                                Reply
                                            </button>
                                        )}

                                        {/* Replies */}
                                        {comment.replies && comment.replies.length > 0 && (
                                            <div className="mt-4 pl-6 border-l-2 border-gray-200 space-y-4">
                                                {comment.replies.map(reply => (
                                                    <div key={reply.id} className="flex gap-3">
                                                        <img
                                                            src={'/images/lego_user.png'}
                                                            alt={reply.author.username}
                                                            className="w-8 h-8 rounded-full flex-shrink-0"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-medium text-gray-900 text-sm">
                                                                    {reply.author.username}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    {formatDate(reply.created_at)}
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-700 text-sm">{reply.content}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Related Posts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {relatedPosts.map(relatedPost => (
                                <Link
                                    key={relatedPost.id}
                                    to={`/blog/${relatedPost.slug}`}
                                    className="group block"
                                >
                                    <div className="aspect-video mb-3 overflow-hidden rounded-md">
                                        <img
                                            src={relatedPost.featured_image || '/images/lego_piece_questionmark.png'}
                                            alt={relatedPost.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                        />
                                    </div>
                                    <h4 className="font-medium text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2">
                                        {relatedPost.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formatDate(relatedPost.published_at)}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </article>

            {/* Back to Blog */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="text-center">
                    <Link 
                        to="/blog" 
                        className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                        <FontAwesomeIcon icon="arrow-left" className="mr-2" />
                        Back to Blog
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default BlogPost;
