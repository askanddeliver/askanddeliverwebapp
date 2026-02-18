import { useState, useEffect } from 'react';
import { Plus, Wand2 } from 'lucide-react';
import { TaskTypeList } from '../components/taskTypes/TaskTypeList';
import { TaskTypeModal } from '../components/taskTypes/TaskTypeModal';
import { taskTypesApi } from '../services/api';
import type { TaskType } from '../types';

function TaskTypes() {
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<TaskType | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await taskTypesApi.getAll();
      setTaskTypes(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load task types:', err);
      setError('Failed to load task types');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const res = await taskTypesApi.seedDefaults();
      setTaskTypes(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to seed defaults:', err);
      setError('Failed to seed defaults. Task types may already exist.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSave = async (data: {
    name: string;
    rate: number;
    color: string;
  }) => {
    try {
      if (editingTaskType) {
        const res = await taskTypesApi.update(editingTaskType._id, data);
        setTaskTypes(
          taskTypes.map((tt) =>
            tt._id === editingTaskType._id ? res.data : tt
          )
        );
      } else {
        const res = await taskTypesApi.create(data);
        setTaskTypes([...taskTypes, res.data]);
      }
      setModalOpen(false);
      setEditingTaskType(null);
      setError(null);
    } catch (err) {
      console.error('Failed to save task type:', err);
      setError('Failed to save task type');
    }
  };

  const handleEdit = (taskType: TaskType) => {
    setEditingTaskType(taskType);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await taskTypesApi.delete(id);
      setTaskTypes(taskTypes.filter((tt) => tt._id !== id));
    } catch (err) {
      console.error('Failed to delete task type:', err);
      setError('Failed to delete task type');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Task Types</h1>
          <p className="text-gray-500 mt-1">
            Configure your work categories and hourly rates
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTaskType(null);
            setModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task Type
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {taskTypes.length === 0 && (
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">Quick start</h3>
          <p className="text-blue-700 text-sm mb-3">
            Seed default task types (Design, Development, Strategy, Meeting,
            Admin) or create your own.
          </p>
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Wand2 className="w-4 h-4" />
            {seeding ? 'Seeding...' : 'Seed Defaults'}
          </button>
        </div>
      )}

      <TaskTypeList
        taskTypes={taskTypes}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TaskTypeModal
        taskType={editingTaskType}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTaskType(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

export default TaskTypes;
