'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, X, Pencil, Trash2, ChevronRight,
  Warehouse, BookMarked, Box, AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { toast } from '@/store/toast.store';

// ── Types ─────────────────────────────────────────────────────────────────────

type LocationType = 'warehouse' | 'shelf' | 'bin';

interface Location {
  id: string;
  name: string;
  type: LocationType;
  address: string | null;
  parentId: string | null;
  parent: Location | null;
  children: Location[];
  isActive: boolean;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  type: z.enum(['warehouse', 'shelf', 'bin']),
  address: z.string().max(500).optional().or(z.literal('')),
  parentId: z.string().uuid('Select a valid parent').optional().or(z.literal('')),
});
type LocationForm = z.infer<typeof locationSchema>;

// ── API ───────────────────────────────────────────────────────────────────────

const fetchLocations = async (): Promise<Location[]> => {
  const res = await api.get('/v1/locations');
  return res.data.data;
};

const createLocation = async (dto: Partial<LocationForm>) => {
  const res = await api.post('/v1/locations', dto);
  return res.data.data;
};

const updateLocation = async ({ id, dto }: { id: string; dto: Partial<LocationForm> }) => {
  const res = await api.patch(`/v1/locations/${id}`, dto);
  return res.data.data;
};

const deleteLocation = async (id: string) => {
  const res = await api.delete(`/v1/locations/${id}`);
  return res.data.data;
};

// ── Type config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<LocationType, {
  label: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  parentLabel: string;
  parentTypes: LocationType[];
}> = {
  warehouse: {
    label: 'Warehouse',
    icon: Warehouse,
    color: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700',
    parentLabel: 'No parent (top-level)',
    parentTypes: [],
  },
  shelf: {
    label: 'Shelf',
    icon: BookMarked,
    color: 'text-purple-600',
    badge: 'bg-purple-50 text-purple-700',
    parentLabel: 'Warehouse',
    parentTypes: ['warehouse'],
  },
  bin: {
    label: 'Bin',
    icon: Box,
    color: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700',
    parentLabel: 'Shelf or Warehouse',
    parentTypes: ['shelf', 'warehouse'],
  },
};

function TypeBadge({ type }: { type: LocationType }) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

function LocationFormModal({
  location,
  allLocations,
  onClose,
}: {
  location: Location | null;
  allLocations: Location[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!location;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name ?? '',
      type: location?.type ?? 'warehouse',
      address: location?.address ?? '',
      parentId: location?.parentId ?? '',
    },
  });

  const selectedType = watch('type');
  const cfg = TYPE_CONFIG[selectedType as LocationType];

  // Locations eligible as parents for the selected type
  const eligibleParents = allLocations.filter(
    (l) =>
      cfg.parentTypes.includes(l.type) &&
      l.id !== location?.id,
  );

  const createMut = useMutation({
    mutationFn: createLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location created successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create location'),
  });

  const updateMut = useMutation({
    mutationFn: updateLocation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Location updated successfully');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update location'),
  });

  const onSubmit = (data: LocationForm) => {
    const clean = {
      name: data.name,
      type: data.type,
      address: data.address || undefined,
      parentId: data.parentId || undefined,
    };
    if (isEdit) updateMut.mutate({ id: location!.id, dto: clean });
    else createMut.mutate(clean);
  };

  const busy = isSubmitting || createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Location' : 'Add Location'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5 space-y-4">
            {/* Type selector */}
            <div>
              <label className="field-label">
                Location Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['warehouse', 'shelf', 'bin'] as LocationType[]).map((t) => {
                  const c = TYPE_CONFIG[t];
                  const Icon = c.icon;
                  const isSelected = selectedType === t;
                  return (
                    <label
                      key={t}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        {...register('type')}
                        type="radio"
                        value={t}
                        className="sr-only"
                      />
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                        {c.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.type && (
                <p className="mt-1 text-xs text-red-500">{errors.type.message}</p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="field-label">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('name')}
                className="field-input"
                placeholder={
                  selectedType === 'warehouse'
                    ? 'e.g. Main Store'
                    : selectedType === 'shelf'
                    ? 'e.g. Shelf A'
                    : 'e.g. Bin A-01'
                }
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Parent selector — hidden for warehouse */}
            {selectedType !== 'warehouse' && (
              <div>
                <label className="field-label">
                  Parent {cfg.parentLabel}{' '}
                  {eligibleParents.length > 0 && <span className="text-red-500">*</span>}
                </label>
                {eligibleParents.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      No {cfg.parentLabel.toLowerCase()} found. Create one first.
                    </span>
                  </div>
                ) : (
                  <select {...register('parentId')} className="field-input">
                    <option value="">— Select parent —</option>
                    {eligibleParents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.parent ? ` (${p.parent.name})` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.parentId && (
                  <p className="mt-1 text-xs text-red-500">{errors.parentId.message}</p>
                )}
              </div>
            )}

            {/* Address — only for warehouse */}
            {selectedType === 'warehouse' && (
              <div>
                <label className="field-label">Address</label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="field-input resize-none"
                  placeholder="Physical address of this warehouse"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({
  location,
  onClose,
}: {
  location: Location;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const hasChildren = location.children?.length > 0;

  const deleteMut = useMutation({
    mutationFn: () => deleteLocation(location.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      toast.success(`Location "${location.name}" deleted`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete location'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">Delete Location</h3>
              <p className="mt-1 text-sm text-gray-500">
                Are you sure you want to delete{' '}
                <span className="font-medium text-gray-800">{location.name}</span>?
              </p>
              {hasChildren && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    This location has{' '}
                    <strong>{location.children.length} child location(s)</strong>.
                    Delete or reassign them first.
                  </span>
                </div>
              )}
              <p className="mt-3 text-xs text-gray-400">
                Any stock stored here will need to be transferred before deletion.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending || hasChildren}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={hasChildren ? 'Delete child locations first' : undefined}
          >
            {deleteMut.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Location Row ──────────────────────────────────────────────────────────────

function LocationRow({
  loc,
  depth,
  onEdit,
  onDelete,
}: {
  loc: Location;
  depth: number;
  onEdit: (l: Location) => void;
  onDelete: (l: Location) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = loc.children?.length > 0;
  const cfg = TYPE_CONFIG[loc.type];
  const Icon = cfg.icon;

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors group">
        <td className="px-4 py-3">
          <div className="flex items-center" style={{ paddingLeft: depth * 24 }}>
            {/* Expand toggle */}
            {hasChildren ? (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mr-1.5 p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>
            ) : (
              <span className="mr-1.5 w-5" />
            )}
            {/* Icon + name */}
            <Icon className={`w-4 h-4 mr-2 flex-shrink-0 ${cfg.color}`} />
            <span className="font-medium text-gray-900">{loc.name}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <TypeBadge type={loc.type} />
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {loc.parent?.name ?? <span className="text-gray-300">—</span>}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {hasChildren ? (
            <span className="text-gray-600">{loc.children.length} sub-location(s)</span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(loc)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(loc)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {/* Recursively render children */}
      {expanded &&
        hasChildren &&
        loc.children.map((child) => (
          <LocationRow
            key={child.id}
            loc={child}
            depth={depth + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LocationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [typeFilter, setTypeFilter] = useState<LocationType | 'all'>('all');

  const openCreate = () => { setEditLocation(null); setShowForm(true); };
  const openEdit = (l: Location) => { setEditLocation(l); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditLocation(null); };

  const { data: locations = [], isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  // Build tree: top-level are those with no parentId
  const roots = locations.filter((l) => !l.parentId);

  // For filter — flatten all matching
  const filtered =
    typeFilter === 'all'
      ? roots
      : locations.filter((l) => l.type === typeFilter);

  // Counts
  const counts = {
    warehouse: locations.filter((l) => l.type === 'warehouse').length,
    shelf: locations.filter((l) => l.type === 'shelf').length,
    bin: locations.filter((l) => l.type === 'bin').length,
  };

  const filterPills: { key: LocationType | 'all'; label: string }[] = [
    { key: 'all', label: `All (${locations.length})` },
    { key: 'warehouse', label: `Warehouses (${counts.warehouse})` },
    { key: 'shelf', label: `Shelves (${counts.shelf})` },
    { key: 'bin', label: `Bins (${counts.bin})` },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Locations</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage warehouses, shelves, and bins where stock is stored
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {(['warehouse', 'shelf', 'bin'] as LocationType[]).map((t) => {
          const cfg = TYPE_CONFIG[t];
          const Icon = cfg.icon;
          return (
            <div key={t} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.badge}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{counts[t]}</p>
                <p className="text-sm text-gray-500">{cfg.label}s</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {filterPills.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Parent</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Children</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16">
                  <Warehouse className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="font-medium text-gray-500">No locations found</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {typeFilter === 'all'
                      ? 'Add a warehouse to get started'
                      : `No ${typeFilter}s yet`}
                  </p>
                </td>
              </tr>
            ) : typeFilter === 'all' ? (
              roots.map((loc) => (
                <LocationRow
                  key={loc.id}
                  loc={loc}
                  depth={0}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))
            ) : (
              filtered.map((loc) => (
                <tr key={loc.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = TYPE_CONFIG[loc.type].icon;
                        return <Icon className={`w-4 h-4 ${TYPE_CONFIG[loc.type].color}`} />;
                      })()}
                      <span className="font-medium text-gray-900">{loc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={loc.type} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {loc.parent?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {loc.children?.length > 0
                      ? `${loc.children.length} sub-location(s)`
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(loc)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(loc)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showForm && (
        <LocationFormModal
          location={editLocation}
          allLocations={locations}
          onClose={closeForm}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          location={deleteTarget}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
