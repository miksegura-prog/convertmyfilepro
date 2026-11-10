import { useParams, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { getPostBySlug, getPublishedPosts } from "@/blog/posts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Calendar, User, Tag } from 'lucide-react';

export default function BlogPost() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en';
  const post = slug ? getPostBySlug(slug) : undefined;

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Post not found</h1>
        <p className="text-muted-foreground mb-8">The article you are looking for does not exist or is not yet published.</p>
        <Link to="/blog">
          <Button variant="default"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog</Button>
        </Link>
      </div>
    );
  }

  const content = lang === 'es' ? post.es : post.en;
  const altContent = lang === 'es' ? post.en : post.es;
  const publishedPosts = getPublishedPosts();
  const isPublished = publishedPosts.some(p => p.slug === post.slug);

  if (!isPublished) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Coming Soon</h1>
        <p className="text-muted-foreground mb-4">{content.title}</p>
        <p className="text-sm text-muted-foreground mb-8">
          Publish date: {new Date(post.publishDate).toLocaleDateString()}
        </p>
        <Link to="/blog">
          <Button variant="default"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Blog</Button>
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/blog" className="inline-flex items-center text-primary hover:underline mb-6 text-sm">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Blog
      </Link>

      {post.image && (
        <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden mb-8 bg-gradient-to-br from-primary/10 to-primary/5">
          <img src={post.image} alt={content.title} className="w-full h-full object-contain p-4" />
        </div>
      )}

      <h1 className="text-3xl sm:text-4xl font-bold mb-4">{content.title}</h1>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
        <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(post.publishDate).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {content.readTime}</span>
        <span className="flex items-center gap-1"><User className="h-4 w-4" /> {post.author}</span>
        <span className="inline-block bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full">{content.category}</span>
      </div>

      {content.tags && content.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {content.tags.map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              <Tag className="h-3 w-3" /> {tag}
            </span>
          ))}
        </div>
      )}

      <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-a:text-primary prose-img:rounded-lg prose-blockquote:border-l-primary prose-blockquote:bg-muted/50 prose-blockquote:py-2 prose-blockquote:px-4 prose-code:bg-muted prose-code:px-1.5 prose-code:rounded">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => {
              const isInternal = href && (href.startsWith('/') || href.startsWith('#'));
              return isInternal
                ? <Link to={href} className="text-primary font-medium hover:underline">{children}</Link>
                : <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">{children}</a>;
            },
            img: ({ src, alt }) => (
              <img src={src} alt={alt || ''} className="rounded-lg w-full object-cover max-h-96" loading="lazy" />
            ),
          }}
        >
          {content.content}
        </ReactMarkdown>
      </div>

      <div className="mt-12 p-4 bg-muted/50 rounded-lg border text-sm text-muted-foreground">
        <p>Also available in: <Link to={`/blog/${post.slug}`} className="text-primary font-medium hover:underline">{lang === 'es' ? 'English' : 'Español'}</Link></p>
        <p className="mt-1">{altContent.title}</p>
      </div>

      <div className="mt-8 text-center">
        <Link to="/blog">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> All articles</Button>
        </Link>
      </div>
    </article>
  );
}
