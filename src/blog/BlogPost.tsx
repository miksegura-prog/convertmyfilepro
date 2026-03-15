import React from "react";
import { useParams, Link } from "react-router-dom";
import { getPostBySlug } from "@/blog/posts";

export default function BlogPost() {

  const { slug } = useParams();
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <h1>Post not found</h1>
        <Link to="/blog">Back to blog</Link>
      </div>
    );
  }

  return (

    <article className="max-w-4xl mx-auto px-6 py-12">

      <Link to="/blog" className="text-blue-600 mb-6 block">
        ← Back to blog
      </Link>

      <h1 className="text-4xl font-bold mb-4">
        {post.title}
      </h1>

      <div className="text-gray-500 mb-8">
        {post.date} · {post.readTime} · {post.author}
      </div>

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

    </article>
  );
}
