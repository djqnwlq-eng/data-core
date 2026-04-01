'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  PlusCircle,
  List,
  FileText,
  Database,
} from 'lucide-react';

const navItems = [
  { href: '/', label: '검색', icon: Search },
  { href: '/register', label: '데이터 등록', icon: PlusCircle },
  { href: '/data', label: '등록된 데이터', icon: List },
  { href: '/manual', label: '매뉴얼', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar text-sidebar-text flex flex-col z-50">
      {/* 로고 */}
      <div className="p-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <Database className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-base font-bold text-white">Data Core</h1>
            <p className="text-[11px] text-slate-400">교육 CS 지식 베이스</p>
          </div>
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
