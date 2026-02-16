import { Eye, EyeOff, Star, StarOff, Pencil, Trash2, ExternalLink, GripVertical } from 'lucide-react';
import type { PortfolioProject } from '../../types';

interface PortfolioProjectListProps {
  projects: PortfolioProject[];
  onEdit: (project: PortfolioProject) => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onToggleFeature: (id: string) => void;
}

export function PortfolioProjectList({
  projects,
  onEdit,
  onDelete,
  onTogglePublish,
  onToggleFeature,
}: PortfolioProjectListProps) {
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
    <div className="space-y-3">
      {projects.map((project) => (
        <div
          key={project._id}
          className={`card flex items-start gap-4 ${
            !project.published ? 'opacity-75 border-dashed' : ''
          }`}
        >
          {/* Drag handle placeholder */}
          <div className="flex-shrink-0 pt-1 text-gray-300 cursor-grab">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Color swatch */}
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0 mt-0.5"
            style={{ backgroundColor: project.color }}
          />

          {/* Project info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 truncate">
                {project.title}
              </h3>
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

            <p className="text-sm text-gray-600 line-clamp-1">
              {project.excerpt}
            </p>

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
                if (window.confirm(`Delete "${project.title}"? This cannot be undone.`)) {
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
      ))}
    </div>
  );
}
