import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  author: string;
  date: string;
  excerpt: string;
  category: string;
  readTime?: string;
  content: string;
}

const postsDirectory = path.join(process.cwd(), 'app/blog');

export function getAllPosts(): BlogPost[] {
  const postDirectories = fs.readdirSync(postsDirectory, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  const posts = postDirectories
    .map(slug => {
      const fullPath = path.join(postsDirectory, slug, 'page.mdx');
      
      if (!fs.existsSync(fullPath)) {
        return null;
      }

      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data, content } = matter(fileContents);

      return {
        slug,
        title: data.title || '',
        author: data.author || '',
        date: data.date || '',
        excerpt: data.excerpt || '',
        category: data.category || '',
        readTime: data.readTime || '',
        content,
      };
    })
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const fullPath = path.join(postsDirectory, slug, 'page.mdx');
  
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || '',
    author: data.author || '',
    date: data.date || '',
    excerpt: data.excerpt || '',
    category: data.category || '',
    readTime: data.readTime || '',
    content,
  };
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
