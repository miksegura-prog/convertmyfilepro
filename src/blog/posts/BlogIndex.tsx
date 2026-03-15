import React from 'react';
import { Link } from 'react-router-dom';
import { blogPosts } from '@/blog/posts';

export default function BlogIndex() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>

      <div className="grid gap-6">
        {blogPosts.map((post) => (
          <article
            key={post.slug}
            className="border rounded-xl p-6 hover:shadow-md transition"
          >
            <h2 className="text-2xl font-semibold mb-2">
              <Link to={`/blog/${post.slug}`} className="hover:underline">
                {post.title}
              </Link>
            </h2>

            {post.excerpt && (
              <p className="text-gray-600 mb-3">{post.excerpt}</p>
            )}

            <div className="text-sm text-gray-500 mb-3">
              <span>{post.category}</span>
              {post.date && <span> · {post.date}</span>}
            </div>

            <Link
              to={`/blog/${post.slug}`}
              className="font-medium hover:underline"
            >
              Read article
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
