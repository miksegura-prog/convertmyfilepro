import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPostBySlug } from '@/blog/posts';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">Post not found</h1>
        <Link to="/blog" className="hover:underline">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-6 py-12">
      <Link to="/blog" className="hover:underline block mb-6">
        ← Back to blog
      </Link>

      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>

      <div className="text-sm text-gray-500 mb-6">
        <span>{post.category}</span>
        {post.date && <span> · {post.date}</span>}
      </div>

      {post.excerpt && (
        <p className="text-lg text-gray-600 mb-8">{post.excerpt}</p>
      )}

      <div className="prose max-w-none">
        {'content' in post && typeof post.content === 'string' ? (
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        ) : (
          <pre className="whitespace-pre-wrap">{JSON.stringify(post, null, 2)}</pre>
        )}
      </div>
    </article>
  );
}
