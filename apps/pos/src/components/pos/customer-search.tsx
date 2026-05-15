'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, User } from 'lucide-react';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  loyaltyPoints?: number;
}

interface Props {
  selected: Customer | null;
  onSelect: (c: Customer | null) => void;
}

export function CustomerSearch({ selected, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const { data: results } = useQuery({
    queryKey: ['customer-search', search],
    queryFn: () => api.get('/users', { params: { search, roles: 'CUSTOMER', limit: 10 } }).then(r => r.data.data?.items ?? []),
    enabled: search.length >= 2,
  });

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <User className="w-4 h-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{selected.firstName} {selected.lastName}</p>
          <p className="text-xs text-gray-500 truncate">{selected.email}</p>
        </div>
        {selected.loyaltyPoints !== undefined && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">{selected.loyaltyPoints} pts</span>
        )}
        <button onClick={() => onSelect(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Search customer..."
          className="flex-1 outline-none text-sm bg-transparent"
        />
      </div>
      {open && results && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
          {results.map((c: Customer) => (
            <button
              key={c.id}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
              onMouseDown={() => { onSelect(c); setSearch(''); setOpen(false); }}
            >
              <User className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.firstName} {c.lastName}</p>
                <p className="text-xs text-gray-400 truncate">{c.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
