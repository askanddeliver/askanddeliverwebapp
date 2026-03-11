import { useState, useEffect, useRef, FormEvent, DragEvent } from 'react';
import { X, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Video } from 'lucide-react';
import type { PortfolioProject, PortfolioImage, PortfolioTestimonial } from '../../types';
import { ImageUpload } from './ImageUpload';
import { MediaUpload } from './MediaUpload';

interface PortfolioProjectModalProps {
  project: PortfolioProject | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<PortfolioProject>) => void;
}

const defaultCategories = [
  'Branding', 'Digital', 'Hospitality', 'Music', 'Event',
  'Environmental', 'Nonprofit', 'Retail', 'Research', 'Education',
  'Product Design', 'UX/UI', 'Experiential', 'Packaging',
  'Public', 'Transportation', 'Strategy',
];

export function PortfolioProjectModal({
  project,
  isOpen,
  onClose,
  onSave,
}: PortfolioProjectModalProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [client, setClient] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [customCategory, setCustomCategory] = useState('');
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [disciplineInput, setDisciplineInput] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [featuredImage, setFeaturedImage] = useState('');
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [challenge, setChallenge] = useState('');
  const [solution, setSolution] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [resultInput, setResultInput] = useState('');
  const [testimonialQuote, setTestimonialQuote] = useState('');
  const [testimonialAuthor, setTestimonialAuthor] = useState('');
  const [testimonialRole, setTestimonialRole] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [published, setPublished] = useState(false);
  const [color, setColor] = useState('#5B7765');
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'media' | 'settings'>('basic');

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setSlug(project.slug);
      setClient(project.client);
      setExcerpt(project.excerpt);
      setDescription(project.description);
      setCategories(project.categories);
      setDisciplines(project.disciplines);
      setYear(project.year);
      setFeaturedImage(project.featuredImage);
      setImages(project.images || []);
      setChallenge(project.challenge || '');
      setSolution(project.solution || '');
      setResults(project.results || []);
      setTestimonialQuote(project.testimonial?.quote || '');
      setTestimonialAuthor(project.testimonial?.author || '');
      setTestimonialRole(project.testimonial?.role || '');
      setLiveUrl(project.liveUrl || '');
      setFeatured(project.featured);
      setPublished(project.published);
      setColor(project.color);
    } else {
      resetForm();
    }
    setActiveTab('basic');
  }, [project, isOpen]);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setClient('');
    setExcerpt('');
    setDescription('');
    setCategories([]);
    setDisciplines([]);
    setYear(new Date().getFullYear());
    setFeaturedImage('');
    setImages([]);
    setChallenge('');
    setSolution('');
    setResults([]);
    setTestimonialQuote('');
    setTestimonialAuthor('');
    setTestimonialRole('');
    setLiveUrl('');
    setFeatured(false);
    setPublished(false);
    setColor('#5B7765');
  };

  const autoSlug = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug only if creating new or slug hasn't been manually edited
    if (!project) {
      setSlug(autoSlug(value));
    }
  };

  const toggleCategory = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    if (customCategory.trim() && !categories.includes(customCategory.trim())) {
      setCategories([...categories, customCategory.trim()]);
      setCustomCategory('');
    }
  };

  const addDiscipline = () => {
    if (disciplineInput.trim() && !disciplines.includes(disciplineInput.trim())) {
      setDisciplines([...disciplines, disciplineInput.trim()]);
      setDisciplineInput('');
    }
  };

  const removeDiscipline = (d: string) => {
    setDisciplines(disciplines.filter((item) => item !== d));
  };

  const addResult = () => {
    if (resultInput.trim()) {
      setResults([...results, resultInput.trim()]);
      setResultInput('');
    }
  };

  const removeResult = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
  };

  const addImage = () => {
    setImages([...images, { url: '', caption: '' }]);
  };

  const updateImage = (index: number, updates: Partial<PortfolioImage>) => {
    const updated = [...images];
    updated[index] = { ...updated[index], ...updates };
    setImages(updated);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  // Drag-to-reorder state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleImageDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleImageDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (dragIndexRef.current !== null && dragIndexRef.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleImageDragEnd = () => {
    if (dragIndexRef.current !== null && dragOverIndex !== null && dragIndexRef.current !== dragOverIndex) {
      const reordered = [...images];
      const [moved] = reordered.splice(dragIndexRef.current, 1);
      reordered.splice(dragOverIndex, 0, moved);
      setImages(reordered);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setImages(reordered);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    let testimonial: PortfolioTestimonial | undefined;
    if (testimonialQuote.trim() && testimonialAuthor.trim()) {
      testimonial = {
        quote: testimonialQuote.trim(),
        author: testimonialAuthor.trim(),
        role: testimonialRole.trim(),
      };
    }

    onSave({
      slug,
      title,
      client,
      excerpt,
      description,
      categories,
      disciplines,
      year,
      featuredImage,
      images: images.filter((img) => img.url.trim()),
      challenge: challenge || undefined,
      solution: solution || undefined,
      results: results.length > 0 ? results : undefined,
      testimonial,
      liveUrl: liveUrl || undefined,
      featured,
      published,
      color,
    });
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'basic' as const, label: 'Basic Info' },
    { id: 'content' as const, label: 'Case Study' },
    { id: 'media' as const, label: 'Media' },
    { id: 'settings' as const, label: 'Settings' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {project ? 'Edit Portfolio Project' : 'New Portfolio Project'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="input"
                      required
                      placeholder="Project title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(autoSlug(e.target.value))}
                      className="input font-mono text-sm"
                      placeholder="auto-generated-from-title"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="input"
                      required
                      placeholder="Client name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(parseInt(e.target.value))}
                      className="input"
                      required
                      min={2000}
                      max={2100}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Excerpt <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    className="input resize-none"
                    rows={2}
                    required
                    placeholder="Short summary shown on portfolio cards"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input resize-none"
                    rows={4}
                    required
                    placeholder="Detailed project description for the case study page"
                  />
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {defaultCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          categories.includes(cat)
                            ? 'bg-primary-100 border-primary-300 text-primary-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCategory())}
                      className="input text-sm flex-1"
                      placeholder="Add custom category..."
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="btn-secondary text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Disciplines */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Disciplines
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {disciplines.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => removeDiscipline(d)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={disciplineInput}
                      onChange={(e) => setDisciplineInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDiscipline())}
                      className="input text-sm flex-1"
                      placeholder="e.g. Brand Identity, Web Development..."
                    />
                    <button
                      type="button"
                      onClick={addDiscipline}
                      className="btn-secondary text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Case Study Tab */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    The Challenge
                  </label>
                  <textarea
                    value={challenge}
                    onChange={(e) => setChallenge(e.target.value)}
                    className="input resize-none"
                    rows={3}
                    placeholder="What problem did the client need solved?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    The Solution
                  </label>
                  <textarea
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    className="input resize-none"
                    rows={3}
                    placeholder="How did you approach and solve the challenge?"
                  />
                </div>

                {/* Results */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Results
                  </label>
                  {results.length > 0 && (
                    <ul className="space-y-2 mb-2">
                      {results.map((result, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg"
                        >
                          <span className="flex-1">{result}</span>
                          <button
                            type="button"
                            onClick={() => removeResult(i)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={resultInput}
                      onChange={(e) => setResultInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResult())}
                      className="input text-sm flex-1"
                      placeholder="e.g. Increased foot traffic by 40%"
                    />
                    <button
                      type="button"
                      onClick={addResult}
                      className="btn-secondary text-sm"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Testimonial */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Testimonial (optional)
                  </h4>
                  <textarea
                    value={testimonialQuote}
                    onChange={(e) => setTestimonialQuote(e.target.value)}
                    className="input resize-none text-sm"
                    rows={2}
                    placeholder="Client quote..."
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={testimonialAuthor}
                      onChange={(e) => setTestimonialAuthor(e.target.value)}
                      className="input text-sm"
                      placeholder="Author name"
                    />
                    <input
                      type="text"
                      value={testimonialRole}
                      onChange={(e) => setTestimonialRole(e.target.value)}
                      className="input text-sm"
                      placeholder="Author role"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <div className="space-y-6">
                <ImageUpload
                  label="Featured Image"
                  value={featuredImage}
                  projectSlug={slug || 'temp'}
                  onChange={(url) => setFeaturedImage(url)}
                  placeholder="Drop a hero image here or click to upload"
                />

                {/* Media Gallery (images + videos) */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Media Gallery
                    </label>
                    <button
                      type="button"
                      onClick={addImage}
                      className="btn-secondary text-xs flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Media
                    </button>
                  </div>

                  {images.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4 text-center">
                      No gallery media. Click &ldquo;Add Media&rdquo; to add images or videos (upload, Vimeo, YouTube).
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {images.map((img, i) => (
                        <div
                          key={i}
                          draggable
                          onDragStart={() => handleImageDragStart(i)}
                          onDragOver={(e) => handleImageDragOver(e, i)}
                          onDragEnd={handleImageDragEnd}
                          className={`bg-gray-50 rounded-lg p-4 space-y-3 transition-all ${
                            dragOverIndex === i
                              ? 'ring-2 ring-primary-400 ring-offset-1 bg-primary-50'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600"
                                title="Drag to reorder"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                {img.type === 'video' || img.source === 'vimeo' || img.source === 'youtube' ? (
                                  <>
                                    <Video className="w-3 h-3" />
                                    Video {i + 1}
                                  </>
                                ) : (
                                  `Image ${i + 1}`
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveImage(i, i - 1)}
                                disabled={i === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(i, i + 1)}
                                disabled={i === images.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="p-1 text-gray-400 hover:text-red-500"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <MediaUpload
                            value={{
                              url: img.url,
                              type: img.type,
                              source: img.source,
                            }}
                            projectSlug={slug || 'temp'}
                            onChange={(media) =>
                              updateImage(i, {
                                url: media.url,
                                type: media.type,
                                source: media.source,
                              })
                            }
                            placeholder="Upload image/video or paste Vimeo/YouTube URL"
                          />
                          <input
                            type="text"
                            value={img.caption || ''}
                            onChange={(e) => updateImage(i, { caption: e.target.value })}
                            className="input text-sm"
                            placeholder="Caption (optional)"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Live Project URL
                  </label>
                  <input
                    type="url"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    className="input text-sm"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="input text-sm font-mono w-32"
                      placeholder="#5B7765"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={published}
                      onChange={(e) => setPublished(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Published</span>
                    <span className="text-xs text-gray-400">
                      (visible on public site)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                    <span className="text-xs text-gray-400">
                      (highlighted on homepage)
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
