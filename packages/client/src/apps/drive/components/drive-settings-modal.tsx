import {
  useDriveSettingsStore,
  type DriveDefaultView,
  type DriveDefaultSort,
  type DriveSidebarDefault,
  type DriveMaxVersions,
  type DriveShareDefaultExpiry,
  type DriveDuplicateHandling,
  type DriveSortOrder,
} from '../settings-store';
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSelect,
} from '../../../components/settings/settings-primitives';

// ---------------------------------------------------------------------------
// Panel: General
// ---------------------------------------------------------------------------

export function DriveGeneralPanel() {
  const {
    defaultView, setDefaultView,
    defaultSort, setDefaultSort,
    sidebarDefault, setSidebarDefault,
    sortOrder, setSortOrder,
    confirmDelete, setConfirmDelete,
  } = useDriveSettingsStore();

  const viewOptions: Array<{ value: DriveDefaultView; label: string }> = [
    { value: 'list', label: 'List' },
    { value: 'grid', label: 'Grid' },
  ];

  const sortOptions: Array<{ value: DriveDefaultSort; label: string }> = [
    { value: 'default', label: 'Default' },
    { value: 'name', label: 'Name' },
    { value: 'size', label: 'Size' },
    { value: 'date', label: 'Date modified' },
    { value: 'type', label: 'Type' },
  ];

  const sidebarOptions: Array<{ value: DriveSidebarDefault; label: string }> = [
    { value: 'files', label: 'My drive' },
    { value: 'favourites', label: 'Favourites' },
    { value: 'recent', label: 'Recent' },
  ];

  const sortOrderOptions: Array<{ value: DriveSortOrder; label: string }> = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' },
  ];

  return (
    <div>
      <SettingsSection title="View & layout" description="Configure default view mode and sorting">
        <SettingsRow label="Default view" description="How files are displayed when opening Drive">
          <SettingsSelect value={defaultView} options={viewOptions} onChange={setDefaultView} />
        </SettingsRow>
        <SettingsRow label="Default sort" description="Default column to sort files by">
          <SettingsSelect value={defaultSort} options={sortOptions} onChange={setDefaultSort} />
        </SettingsRow>
        <SettingsRow label="Sort direction" description="Sort ascending or descending">
          <SettingsSelect value={sortOrder} options={sortOrderOptions} onChange={setSortOrder} />
        </SettingsRow>
        <SettingsRow label="Sidebar default" description="Which section opens by default">
          <SettingsSelect value={sidebarDefault} options={sidebarOptions} onChange={setSidebarDefault} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Safety" description="Deletion and safety settings">
        <SettingsRow label="Confirm before delete" description="Show confirmation dialog before moving items to trash">
          <SettingsToggle checked={confirmDelete} onChange={setConfirmDelete} label="Confirm before delete" />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Display
// ---------------------------------------------------------------------------

export function DriveDisplayPanel() {
  const {
    showPreviewPanel, setShowPreviewPanel,
    compactMode, setCompactMode,
    showThumbnails, setShowThumbnails,
    showFileExtensions, setShowFileExtensions,
  } = useDriveSettingsStore();

  return (
    <div>
      <SettingsSection title="Display options" description="Control how files and folders appear">
        <SettingsRow label="Preview panel" description="Automatically show file preview when selecting a file">
          <SettingsToggle checked={showPreviewPanel} onChange={setShowPreviewPanel} label="Preview panel" />
        </SettingsRow>
        <SettingsRow label="Compact mode" description="Reduce row height in list view for denser display">
          <SettingsToggle checked={compactMode} onChange={setCompactMode} label="Compact mode" />
        </SettingsRow>
        <SettingsRow label="Show thumbnails" description="Display image thumbnails in grid and list views">
          <SettingsToggle checked={showThumbnails} onChange={setShowThumbnails} label="Show thumbnails" />
        </SettingsRow>
        <SettingsRow label="Show file extensions" description="Display file extensions in file names">
          <SettingsToggle checked={showFileExtensions} onChange={setShowFileExtensions} label="Show file extensions" />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel: Files
// ---------------------------------------------------------------------------

export function DriveFilesPanel() {
  const {
    autoVersionOnReplace, setAutoVersionOnReplace,
    maxVersions, setMaxVersions,
    shareDefaultExpiry, setShareDefaultExpiry,
    duplicateHandling, setDuplicateHandling,
  } = useDriveSettingsStore();

  const maxVersionOptions: Array<{ value: DriveMaxVersions; label: string }> = [
    { value: 5, label: '5 versions' },
    { value: 10, label: '10 versions' },
    { value: 20, label: '20 versions' },
    { value: 50, label: '50 versions' },
  ];

  const expiryOptions: Array<{ value: DriveShareDefaultExpiry; label: string }> = [
    { value: 'never', label: 'Never' },
    { value: '1', label: '1 day' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
  ];

  const duplicateOptions: Array<{ value: DriveDuplicateHandling; label: string }> = [
    { value: 'rename', label: 'Rename with suffix' },
    { value: 'replace', label: 'Replace existing' },
    { value: 'ask', label: 'Ask each time' },
  ];

  return (
    <div>
      <SettingsSection title="Versioning" description="Configure file version history">
        <SettingsRow label="Auto-version on replace" description="Automatically save the previous version when uploading a replacement file">
          <SettingsToggle checked={autoVersionOnReplace} onChange={setAutoVersionOnReplace} label="Auto-version on replace" />
        </SettingsRow>
        <SettingsRow label="Max versions" description="Maximum number of versions to keep per file">
          <SettingsSelect value={maxVersions} options={maxVersionOptions} onChange={setMaxVersions} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Sharing" description="Default sharing behavior">
        <SettingsRow label="Default link expiry" description="Default expiration for newly created share links">
          <SettingsSelect value={shareDefaultExpiry} options={expiryOptions} onChange={setShareDefaultExpiry} />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Uploads" description="How duplicate file names are handled">
        <SettingsRow label="Duplicate handling" description="What happens when uploading a file with the same name">
          <SettingsSelect value={duplicateHandling} options={duplicateOptions} onChange={setDuplicateHandling} />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
