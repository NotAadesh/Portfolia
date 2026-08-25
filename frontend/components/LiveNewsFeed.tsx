"use client";

import React from "react";

interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  url: string;
  published_at: string;
  relative_time: string;
  summary?: string;
  thumbnail?: string;
  source?: string;
}

interface LiveNewsFeedProps {
  news: NewsItem[];
  companyName: string;
  ticker: string;
}

export default function LiveNewsFeed({ news, companyName, ticker }: LiveNewsFeedProps) {
  if (!news || news.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center text-slate-400 text-xs">
        No recent disclosures or news coverage available for {companyName}.
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Market Disclosures & Real-Time Media</h3>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
          {news.length} Sources
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block py-3 hover:bg-slate-50/80 px-2 rounded-lg transition-all"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                    {item.publisher}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400">{item.relative_time}</span>
                </div>

                <h4 className="text-xs font-medium text-slate-900 group-hover:text-blue-600 transition-colors leading-relaxed">
                  {item.title}
                </h4>
              </div>

              <span className="text-slate-300 group-hover:text-blue-600 transition-colors text-xs pt-1">
                ↗
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
