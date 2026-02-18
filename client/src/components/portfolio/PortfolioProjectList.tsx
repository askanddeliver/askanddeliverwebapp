import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eye,
  EyeOff,
  Star,
  StarOff,
  Pencil,
  Trash2,
  ExternalLink,
  GripVertical,
} from 'lucide-react';
import type { PortfolioProject } from '../../types';

interface PortfolioProjectListProps {
  projects: PortfolioProject[];
  onEdit: (project: PortfolioProject) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onToggleFeature: (id: string) => void;
  onReorder: (projectIds: string[]) => void;
}

function SortableProjectCard({
  project,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeature,
}: {
  project: PortfolioProject;
  onEdit: (project: PortfolioProject) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onToggleFeature: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card flex items-start gap-4 ${
        !project.published ? 'opacity-75 border-dashed' : ''
      } ${isDragging ? 'shadow-lg ring-2 ring-primary-200 z-10 relative' : ''}`}
    >
      {/* Drag handle */}
      <button
        className="flex-shrink-0 pt-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Color swatch */}
      <div
        className="w-10 h-10 rounded-lg flex-shrink-0 mt-0.5"
        style={{ backgroundColor: project.color }}
      />

      {/* Project info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-gray-900 truncate">{project.title}</h3>
          {project.featured && (
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
              Featured
            </span>
          )}
          {project.published ? (
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              Published
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
              Draft
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-1">
          {project.client} &middot; {project.year}
        </p>

        <p className="text-sm text-gray-600 line-clamp-1">{project.excerpt}</p>

        <div className="flex flex-wrap gap-1 mt-2">
          {project.categories.map((cat) => (
            <span
              key={cat}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => onToggleFeature(project._id)}
          className={`p-2 rounded-lg transition-colors ${
            project.featured
              ? 'text-yellow-500 hover:bg-yellow-50'
              : 'text-gray-400 hover:bg-gray-50 hover:text-yellow-500'
          }`}
          title={project.featured ? 'Remove from featured' : 'Mark as featured'}
        >
          {project.featured ? (
            <Star className="w-4 h-4 fill-current" />
          ) : (
            <StarOff className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={() => onTogglePublish(project._id)}
          className={`p-2 rounded-lg transition-colors ${
            project.published
              ? 'text-green-500 hover:bg-green-50'
              : 'text-gray-400 hover:bg-gray-50 hover:text-green-500'
          }`}
          title={project.published ? 'Unpublish' : 'Publish'}
        >
          {project.published ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
        </button>

        {project.published && (
          <a
            href={`/work/${project.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="View public page"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <button
          onClick={() => onEdit(project)}
          className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            if (
              window.confirm(
                `Delete "${project.title}"? This cannot be undone.`
              )
            ) {
              onDelete(project._id);
            }
          }}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function PortfolioProjectList({
  projects,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeature,
  onReorder,
}: PortfolioProjectListProps) {
  const [items, setItems] = useState(projects);

  // Keep local state in sync when props change (e.g. after publish/feature toggle, add, delete)
  useEffect(() => {
    setItems(projects);
  }, [projects]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((p) => p._id === active.id);
    const newIndex = items.findIndex((p) => p._id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    setItems(reordered);
    onReorder(reordered.map((p) => p._id));
  };

  if (projects.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 mb-2">No portfolio projects yet</p>
        <p className="text-gray-400 text-sm">
          Create your first project or seed from existing data.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((p) => p._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((project) => (
            <SortableProjectCard
              key={project._id}
              project={project}
              onEdit={onEdit}
              onDelete={onDelete}
              onTogglePublish={onTogglePublish}
              onToggleFeature={onToggleFeature}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
