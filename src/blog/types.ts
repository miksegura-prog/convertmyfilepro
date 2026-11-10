export interface LocalizedBlogContent {
  title: string;
  description: string;
  content: string;
  readTime: string;
  category: string;
  tags: string[];
}

export interface BlogPost {
  slug: string;
  publishDate: string; // YYYY-MM-DD — artículo visible si <= fecha actual
  author: string;
  image: string; // ruta a ilustración SVG /blog/ilustracion.svg
  featured?: boolean;
  es: LocalizedBlogContent;
  en: LocalizedBlogContent;
}

export interface BlogCategory {
  name: string;
  slug: string;
  count: number;
}
