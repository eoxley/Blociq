import { Suspense } from 'react';
import GeneralLabClient from './GeneralLabClient';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GeneralDocumentsLabPage() {
  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 py-16 mx-6 rounded-2xl">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center mb-6">
            <Link
              href="/documents"
              className="flex items-center text-white/80 hover:text-white transition-all duration-300 mr-4 group"
            >
              <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Document Library
            </Link>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-5 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl">
                <FileText className="h-14 w-14 text-white drop-shadow-lg" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
              General Documents
            </h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              Upload and organize general business documents with intelligent classification and analysis
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-indigo-400/20 rounded-full blur-2xl"></div>
        </div>
      </section>

      {/* Content */}
      <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg mx-6"></div>}>
        <div className="mx-6">
          <GeneralLabClient />
        </div>
      </Suspense>
    </div>
  );
}