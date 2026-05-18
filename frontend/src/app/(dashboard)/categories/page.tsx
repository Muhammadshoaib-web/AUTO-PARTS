'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';
import {
  Plus, Search, Tag, Pencil, Trash2, X, ChevronRight,
  FolderTree, AlertTriangle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  nameEn: string;
  nameUr: string | null;
  slug: string;
  description: string | null;
  parentId: string | null;
  parent: Pick<Category, 'id' | 'nameEn'> | null;
  children: Pick<Category, 'id' | 'nameEn'>[];
  isActive: boolean;
  createdAt: string;
}

// ── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  nameEn: z.string().min(1, 'English name is required').max(150),
  nameUr: z.string().max(150).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  parentId: z.string().uuid('Must be a valid category').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

// ── API helpers ──────────────────────────────────────────────────────────────

const fetchCategories = (search?: string): Promise<Category[]> =>
  api
    .get('/v1/categories', { params: search ? { search } : undefined })
    .then((r) => r.data.data ?? r.data);

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', search],
    queryFn: () => fetchCategories(search || undefined),
  });

  const closeModal = () => {
    setModal(null);
    setSelected(null);
  };

  const openEdit = (cat: Category) => {
    setSelected(cat);
    setModal('edit');
  };

  const openDelete = (cat: Category) => {
    setSelected(cat);
    setModal('delete');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary flex-shrink-0">
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left">
                <Th>Name (EN)</Th>
                <Th>Name (UR)</Th>
                <Th>Slug</Th>
                <Th>Parent</Th>
                <Th>Sub-categories</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <SkeletonRows />
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <FolderTree size={36} className="text-gray-200" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          {search ? 'No categories match your search' : 'No categories yet'}
                        </p>
                        {!search && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Create your first category to start organising parts
                          </p>
                        )}
                      </div>
                      {!search && (
                        <button
                          onClick={() => setModal('create')}
                          className="mt-1 text-sm text-blue-600 hover:underline"
                        >
                          + Add Category
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="group hover:bg-gray-50 transition-colors">
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Tag size={13} className="text-blue-500" />
                        </div>
                        <span className="font-medium text-gray-900">{cat.nameEn}</span>
                      </div>
                    </Td>
                    <Td className="text-gray-500">{cat.nameUr || '—'}</Td>
                    <Td>
                      <span className="font-mono text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                        {cat.slug}
                      </span>
                    </Td>
                    <Td>
                      {cat.parent ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          <ChevronRight size={12} className="text-gray-400" />
                          {cat.parent.nameEn}
                        </span>
                      ) : (
                        <span className="text-gray-400">Root</span>
                      )}
                    </Td>
                    <Td>
                      {cat.children.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {cat.children.length} sub
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          cat.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ActionBtn
                          onClick={() => openEdit(cat)}
                          title="Edit"
                          className="hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Pencil size={14} />
                        </ActionBtn>
                        <ActionBtn
                          onClick={() => openDelete(cat)}
                          title="Delete"
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </ActionBtn>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <CategoryFormModal
          category={modal === 'edit' ? selected : null}
          allCategories={categories}
          onClose={closeModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            closeModal();
          }}
        />
      )}

      {modal === 'delete' && selected && (
        <DeleteModal
          category={selected}
          onClose={closeModal}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            closeModal();
          }}
        />
      )}
    </div>
  );
}

// ── Category Form Modal ───────────────────────────────────────────────────────

function CategoryFormModal({
  category,
  allCategories,
  onClose,
  onSuccess,
}: {
  category: Category | null;
  allCategories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameEn: category?.nameEn ?? '',
      nameUr: category?.nameUr ?? '',
      description: category?.description ?? '',
      parentId: category?.parentId ?? '',
    },
  });

  useEffect(() => {
    reset({
      nameEn: category?.nameEn ?? '',
      nameUr: category?.nameUr ?? '',
      description: category?.description ?? '',
      parentId: category?.parentId ?? '',
    });
  }, [category, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload = {
      nameEn: values.nameEn,
      nameUr: values.nameUr || undefined,
      description: values.description || undefined,
      parentId: values.parentId || undefined,
    };

    try {
      if (isEdit) {
        await api.patch(`/v1/categories/${category!.id}`, payload);
        toast.success(`"${values.nameEn}" updated successfully`);
      } else {
        await api.post('/v1/categories', payload);
        toast.success(`"${values.nameEn}" created successfully`);
      }
      onSuccess();
    } catch (err: any) {
      const msg =
        err.response?.data?.error?.message ??
        err.response?.data?.message ??
        'Something went wrong';
      toast.error(msg);
    }
  };

  // Exclude the category being edited and its children from parent options
  const parentOptions = allCategories.filter(
    (c) => c.id !== category?.id && c.parentId !== category?.id,
  );

  return (
    <Modal onClose={onClose} title={isEdit ? 'Edit Category' : 'New Category'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Name EN */}
        <div>
          <label className="field-label">
            Name (English) <span className="text-red-500">*</span>
          </label>
          <input
            {...register('nameEn')}
            placeholder="e.g. Engine Parts"
            className={`field-input ${errors.nameEn ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
          {errors.nameEn && <FieldError>{errors.nameEn.message}</FieldError>}
        </div>

        {/* Name UR */}
        <div>
          <label className="field-label">Name (Urdu) <span className="text-gray-400">(optional)</span></label>
          <input
            {...register('nameUr')}
            placeholder="e.g. انجن پارٹس"
            dir="rtl"
            className="field-input"
          />
        </div>

        {/* Description */}
        <div>
          <label className="field-label">Description <span className="text-gray-400">(optional)</span></label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Brief description of this category…"
            className="field-input resize-none"
          />
          {errors.description && <FieldError>{errors.description.message}</FieldError>}
        </div>

        {/* Parent */}
        <div>
          <label className="field-label">Parent Category <span className="text-gray-400">(optional)</span></label>
          <select {...register('parentId')} className="field-input bg-white">
            <option value="">— None (root category) —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner /> {isEdit ? 'Saving…' : 'Creating…'}
              </span>
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Category'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteModal({
  category,
  onClose,
  onSuccess,
}: {
  category: Category;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const hasChildren = category.children.length > 0;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/v1/categories/${category.id}`);
      toast.success(`"${category.nameEn}" deleted`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message ?? 'Failed to delete category');
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Delete Category" maxWidth="max-w-sm">
      <div className="space-y-4">
        {hasChildren && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This category has <strong>{category.children.length}</strong> sub-categor
              {category.children.length === 1 ? 'y' : 'ies'}. Deleting it will orphan them.
            </p>
          </div>
        )}

        <p className="text-sm text-gray-600">
          Are you sure you want to delete{' '}
          <strong className="text-gray-900">&quot;{category.nameEn}&quot;</strong>?
          <br />
          <span className="text-gray-400 text-xs mt-1 block">
            The category will be hidden but data is preserved.
          </span>
        </p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <><Spinner /> Deleting…</> : <><Trash2 size={15} /> Delete</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Modal({
  children,
  onClose,
  title,
  maxWidth = 'max-w-lg',
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${maxWidth} bg-white rounded-2xl shadow-2xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function ActionBtn({
  children,
  onClick,
  title,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-red-500">{children}</p>;
}

function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + j * 7}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
