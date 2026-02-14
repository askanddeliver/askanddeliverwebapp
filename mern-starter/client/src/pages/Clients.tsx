import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { ClientList } from '../components/clients/ClientList';
import { ClientModal } from '../components/clients/ClientModal';
import { clientsApi, taskTypesApi } from '../services/api';
import type { Client, TaskType } from '../types';

function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clientsRes, taskTypesRes] = await Promise.all([
        clientsApi.getAll(),
        taskTypesApi.getAll(),
      ]);
      setClients(clientsRes.data || []);
      setTaskTypes(taskTypesRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: {
    name: string;
    company?: string;
    email?: string;
    taskDiscounts: Record<string, number>;
  }) => {
    try {
      if (editingClient) {
        const res = await clientsApi.update(editingClient._id, data);
        setClients(
          clients.map((c) => (c._id === editingClient._id ? res.data : c))
        );
      } else {
        const res = await clientsApi.create(data);
        setClients([res.data, ...clients]);
      }
      setModalOpen(false);
      setEditingClient(null);
      setError(null);
    } catch (err) {
      console.error('Failed to save client:', err);
      setError('Failed to save client');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await clientsApi.delete(id);
      setClients(clients.filter((c) => c._id !== id));
    } catch (err) {
      console.error('Failed to delete client:', err);
      setError('Failed to delete client');
    }
  };

  const handleNewClient = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            Manage your clients and their discount rates
          </p>
        </div>
        <button
          onClick={handleNewClient}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Client
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <ClientList
        clients={clients}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ClientModal
        client={editingClient}
        taskTypes={taskTypes}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingClient(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

export default Clients;
