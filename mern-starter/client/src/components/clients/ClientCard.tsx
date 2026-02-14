import { Pencil, Trash2, Building2, Mail } from 'lucide-react';
import type { Client } from '../../types';

interface ClientCardProps {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export function ClientCard({ client, onEdit, onDelete }: ClientCardProps) {
  const discountCount = Object.values(client.taskDiscounts || {}).filter(
    (d) => d > 0
  ).length;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {client.name}
          </h3>
          {client.company && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{client.company}</span>
            </div>
          )}
          {client.email && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Mail className="w-3.5 h-3.5" />
              <span>{client.email}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => onEdit(client)}
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="Edit client"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Are you sure you want to delete "${client.name}"?`
                )
              ) {
                onDelete(client._id);
              }
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete client"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {discountCount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
            {discountCount} discount{discountCount !== 1 ? 's' : ''} applied
          </span>
        </div>
      )}
    </div>
  );
}
