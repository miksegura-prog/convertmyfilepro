import React from "react";
import { Link } from "react-router-dom";
import { blogPosts } from "@/blog/posts";

export default function BlogIndex() {

  return (

    <div style={{padding:"40px", maxWidth:"900px", margin:"auto"}}>

      <h1>Blog</h1>

      {blogPosts.length === 0 && (
        <p>No posts found</p>
      )}

      {blogPosts.map((post) => (

        <div key={post.slug} style={{marginBottom:"30px"}}>

          <h2>
            <Link to={`/blog/${post.slug}`}>
              {post.title}
            </Link>
          </h2>

          <p>{post.description}</p>

          <small>
            {post.category} • {post.readTime}
          </small>

        </div>

      ))}

    </div>

  );

}