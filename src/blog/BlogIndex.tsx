import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { getPublishedPosts } from "@/blog/posts";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, ArrowRight } from 'lucide-react';

export default function BlogIndex() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith('es') ? 'es' : 'en';

  // Only show published posts
  const published = getPublishedPosts();
  // Sort by publishDate descending
  const sorted = [...published].sort((a, b) => b.publishDate.localeCompare(a.publishDate));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">
          {t('blog.title') || 'Blog'}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('blog.subtitle') || 'Guides, tutorials and tips to get the most out of our file conversion tools.'}
        </p>
        <div className="mt-2 text-sm text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? (t('blog.article') || 'article') : (t('blog.articles') || 'articles')}
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-20">
          <p className="text-xl text-muted-foreground">{t('blog.noPosts') || 'No articles published yet. Come back soon!'}</p>
        </div>
      )}

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sorted.map((post) => {
          const content = lang === 'es' ? post.es : post.en;
          return (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="group block">
              <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20">
                {/* Image */}
                {post.image && (
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                    <img
                      src={post.image}
                      alt={content.title}
                      className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-5">
                  {/* Category + Read time */}
                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    <span className="inline-block bg-primary/10 text-primary font-medium px-2.5 py-0.5 rounded-full">
                      {content.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {content.readTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {content.title}
                  </h2>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {content.description}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.publishDate).toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                      {t('blog.readMore') || 'Read more'} <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}