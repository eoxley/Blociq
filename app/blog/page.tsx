import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, User } from 'lucide-react';
import { getAllPosts, formatDate } from '@/lib/blog';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BlocIQ Blog — AI & Property Management',
  description: 'Thoughts, updates, and insights on AI, compliance, and the future of UK block management.',
  openGraph: {
    type: 'website',
    title: 'BlocIQ Blog — AI & Property Management',
    description: 'Thoughts, updates, and insights on AI, compliance, and the future of UK block management.',
    url: 'https://blociq.co.uk/blog',
    siteName: 'BlocIQ',
    images: [
      {
        url: 'https://blociq.co.uk/og-blog-default.png',
        width: 1200,
        height: 630,
        alt: 'BlocIQ Blog — AI & Property Management',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BlocIQ Blog — AI & Property Management',
    description: 'Thoughts, updates, and insights on AI, compliance, and the future of UK block management.',
    images: ['https://blociq.co.uk/og-blog-default.png'],
  },
};

export default function BlogPage() {
  const blogPosts = getAllPosts();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6A00F5] via-[#7A2BE2] to-[#8A2BE2] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            BlocIQ Insights
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Thoughts, updates, and ideas on AI and property management.
          </p>
        </div>
      </div>

      {/* Blog Posts */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article key={post.slug} className="bg-white rounded-xl shadow-md hover:shadow-lg p-6 transition-shadow">
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                  {post.category}
                </span>
              </div>
              
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                <Link href={`/blog/${post.slug}`} className="hover:text-[#6A00F5] transition-colors">
                  {post.title}
                </Link>
              </h2>
              
              <p className="text-gray-600 mb-6">
                {post.excerpt}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(post.date)}</span>
                  </div>
                </div>
                <Link 
                  href={`/blog/${post.slug}`}
                  className="text-[#6A00F5] hover:text-[#5A00E5] font-medium flex items-center gap-1"
                >
                  Read More
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
        
        {/* Empty state for when there are no posts */}
        {blogPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
