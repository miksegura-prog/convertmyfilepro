export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  date: string;
  readTime: string;
  author: string;
  category: string;
  tags: string[];
  image?: string;
  featured?: boolean;
}

export interface BlogCategory {
  name: string;
  slug: string;
  count: number;
}
