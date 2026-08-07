import { useMemo, useState } from "react";
import type { ReactNode } from "react";

const assets = {
  home: "./assets/home.svg",
  users: "./assets/users.svg",
  bookmark: "./assets/bookmark.svg",
  scan: "./assets/scan.svg",
  more: "./assets/more-square.svg",
  avatar: "./assets/avatar.png",
  avatarRing: "./assets/avatar-ring.svg",
  notification: "./assets/notification.svg",
  search: "./assets/search.svg",
  filter: "./assets/filter.svg",
  category: "./assets/category.svg",
  folder: "./assets/folder.svg",
  moreBlue: "./assets/more-square-blue.svg",
  pdf: "./assets/pdf.svg",
  pdfMark: "./assets/pdf-mark.svg",
  plus: "./assets/plus.svg"
} as const;

type Folder = { id: string; name: string };
type DocumentItem = { id: string; name: string; size: string; type?: string };

const initialFolders: Folder[] = [
  { id: "property", name: "Property docs" },
  { id: "business", name: "Business docs" },
  { id: "health", name: "Health docs" },
  { id: "financial", name: "Financial docs" }
];

const initialDocuments: DocumentItem[] = [
  { id: "property-paper-1", name: "Property paper.pdf", size: "1.5MB" },
  { id: "property-paper-2", name: "Property paper.pdf", size: "1.5MB" },
  { id: "property-paper-3", name: "Property paper.pdf", size: "1.5MB" },
  { id: "property-paper-4", name: "Property paper.pdf", size: "1.5MB" }
];

function IconImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  return <img className={className} src={src} alt={alt} draggable={false} />;
}

function StatusBar() {
  return (
    <div className="status-bar" aria-label="Status bar">
      <span className="status-time">08:34</span>
      <div className="status-details">
        <span className="network-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="network-type">4G</span>
        <span className="battery" aria-label="Battery 50%"><i /><b /></span>
      </div>
    </div>
  );
}

function ProfileAvatar() {
  return (
    <span className="profile-avatar" aria-label="Profile">
      <IconImage src={assets.avatarRing} className="avatar-ring" />
      <IconImage src={assets.avatar} className="avatar-photo" />
    </span>
  );
}

function Header({
  query,
  onQueryChange,
  onFilter,
  onNotification,
  onProfile,
  notificationOpen,
  profileOpen
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onFilter: () => void;
  onNotification: () => void;
  onProfile: () => void;
  notificationOpen: boolean;
  profileOpen: boolean;
}) {
  return (
    <header className="header-area">
      <div className="title-row">
        <h1><span>Doc</span> <strong>Store</strong></h1>
        <div className="header-actions">
          <button className={`icon-button notification-button ${notificationOpen ? "is-active" : ""}`} onClick={onNotification} aria-label="Notifications">
            <IconImage src={assets.notification} />
            <span className="notification-dot" />
          </button>
          <button className={`profile-button ${profileOpen ? "is-active" : ""}`} onClick={onProfile} aria-label="Open profile">
            <ProfileAvatar />
          </button>
        </div>
      </div>
      <label className="search-box">
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search Documents..." aria-label="Search documents" />
        <span className="search-tools">
          <IconImage src={assets.search} />
          <button type="button" onClick={onFilter} aria-label="Filter documents"><IconImage src={assets.filter} /></button>
        </span>
      </label>
    </header>
  );
}

function FolderCard({ folder, onMenu }: { folder: Folder; onMenu: (id: string) => void }) {
  return (
    <article className="folder-card">
      <IconImage src={assets.folder} alt="" className="folder-illustration" />
      <div className="folder-name-row">
        <span>{folder.name}</span>
        <button type="button" onClick={() => onMenu(folder.id)} aria-label={`More options for ${folder.name}`}>
          <IconImage src={assets.moreBlue} />
        </button>
      </div>
    </article>
  );
}

function FolderList({ folders, listMode, onMenu }: { folders: Folder[]; listMode: boolean; onMenu: (id: string) => void }) {
  return (
    <div className={`folders-grid ${listMode ? "list-mode" : ""}`}>
      {folders.map((folder) => listMode ? (
        <div className="folder-list-row" key={folder.id}>
          <IconImage src={assets.folder} className="folder-list-icon" />
          <span>{folder.name}</span>
          <button type="button" onClick={() => onMenu(folder.id)} aria-label={`More options for ${folder.name}`}><IconImage src={assets.moreBlue} /></button>
        </div>
      ) : <FolderCard folder={folder} onMenu={onMenu} key={folder.id} />)}
    </div>
  );
}

function PdfIcon() {
  return (
    <span className="pdf-icon">
      <IconImage src={assets.pdf} />
      <IconImage src={assets.pdfMark} />
    </span>
  );
}

function DocumentRow({ item, onMenu }: { item: DocumentItem; onMenu: (id: string) => void }) {
  return (
    <article className="document-row">
      <div className="document-main">
        <PdfIcon />
        <div className="document-copy">
          <strong>{item.name}</strong>
          <span>{item.size}</span>
        </div>
      </div>
      <button type="button" onClick={() => onMenu(item.id)} aria-label={`More options for ${item.name}`}><IconImage src={assets.moreBlue} /></button>
    </article>
  );
}

function BottomNav({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  const links = [
    { id: "home", label: "Home", icon: assets.home },
    { id: "shared", label: "Shared", icon: assets.users },
    { id: "bookmark", label: "Bookmark", icon: assets.bookmark },
    { id: "scan", label: "Scan", icon: assets.scan },
    { id: "more", label: "More", icon: assets.more }
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {links.map((link) => (
        <button key={link.id} className={`nav-item ${active === link.id ? "active" : ""}`} onClick={() => onChange(link.id)} aria-label={link.label}>
          <span className="nav-icon"><IconImage src={link.icon} /></span>
          {active === link.id && <span>{link.label}</span>}
        </button>
      ))}
    </nav>
  );
}

function Popover({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="popover-card">
      <div className="popover-heading"><strong>{title}</strong><button onClick={onClose} aria-label="Close">×</button></div>
      {children}
    </div>
  );
}

function AddDocumentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: DocumentItem) => void }) {
  const [fileName, setFileName] = useState("");
  const [folder, setFolder] = useState("Property docs");
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-document-title">
        <div className="modal-heading"><div><span className="eyebrow">NEW FILE</span><h2 id="add-document-title">Add document</h2></div><button onClick={onClose} aria-label="Close">×</button></div>
        <label className="file-drop">
          <input type="file" accept=".pdf,.doc,.docx,.png,.jpg" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
          <span className="file-plus">+</span>
          <strong>{fileName || "Choose a file"}</strong>
          <small>PDF, DOCX or image · up to 10MB</small>
        </label>
        <label className="modal-field"><span>Folder</span><select value={folder} onChange={(event) => setFolder(event.target.value)}>{initialFolders.map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
        <button className="modal-primary" disabled={!fileName} onClick={() => onAdd({ id: `${Date.now()}`, name: fileName, size: "0.8MB", type: folder })}>Add document</button>
      </div>
    </div>
  );
}

export function App() {
  const [query, setQuery] = useState("");
  const [listMode, setListMode] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [documents, setDocuments] = useState(initialDocuments);

  const filteredFolders = useMemo(() => initialFolders.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const filteredDocuments = useMemo(() => {
    const visible = documents.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    return showAll ? visible : visible.slice(0, 3);
  }, [documents, query, showAll]);

  const handleAdd = (item: DocumentItem) => {
    setDocuments((current) => [item, ...current]);
    setModalOpen(false);
    setShowAll(true);
  };

  return (
    <main className="stage" onClick={() => menuId && setMenuId(null)}>
      <div className="app-shell" onClick={(event) => event.stopPropagation()}>
        <StatusBar />
        <Header
          query={query}
          onQueryChange={setQuery}
          onFilter={() => setFilterOpen((open) => !open)}
          onNotification={() => { setNotificationOpen((open) => !open); setProfileOpen(false); }}
          onProfile={() => { setProfileOpen((open) => !open); setNotificationOpen(false); }}
          notificationOpen={notificationOpen}
          profileOpen={profileOpen}
        />

        {notificationOpen && <div className="popover-anchor notification-anchor"><Popover title="Notifications" onClose={() => setNotificationOpen(false)}><p className="popover-empty">You&apos;re all caught up.</p></Popover></div>}
        {profileOpen && <div className="popover-anchor profile-anchor"><Popover title="Profile" onClose={() => setProfileOpen(false)}><p className="profile-name">Alex Morgan</p><small>alex@docstore.app</small><button className="popover-link" onClick={() => setProfileOpen(false)}>Manage account</button></Popover></div>}
        {filterOpen && <div className="popover-anchor filter-anchor"><Popover title="Filter" onClose={() => setFilterOpen(false)}><button className="filter-option active" onClick={() => setFilterOpen(false)}>All documents <span>✓</span></button><button className="filter-option" onClick={() => setFilterOpen(false)}>PDF files</button><button className="filter-option" onClick={() => setFilterOpen(false)}>Recently added</button></Popover></div>}

        <section className="content-area">
          <section className="folders-section" aria-labelledby="folders-title">
            <div className="section-heading"><h2 id="folders-title">Folders</h2><button className={`grid-toggle ${listMode ? "is-active" : ""}`} onClick={() => setListMode((value) => !value)} aria-label="Toggle folder layout"><IconImage src={assets.category} /></button></div>
            <FolderList folders={filteredFolders} listMode={listMode} onMenu={(id) => setMenuId(menuId === id ? null : id)} />
          </section>
          <section className="activity-section" aria-labelledby="recent-title">
            <div className="section-heading"><h2 id="recent-title">Recent Activity</h2><button className="view-all" onClick={() => setShowAll((value) => !value)}>{showAll ? "Show Less" : "View All"}</button></div>
            <div className="document-list">{filteredDocuments.map((item) => <DocumentRow item={item} onMenu={(id) => setMenuId(menuId === id ? null : id)} key={item.id} />)}</div>
            {!filteredDocuments.length && <p className="no-results">No documents found.</p>}
          </section>
        </section>

        {menuId && <div className="context-menu" onClick={(event) => event.stopPropagation()}><button onClick={() => setMenuId(null)}>Open</button><button onClick={() => setMenuId(null)}>Move to folder</button><button className="danger" onClick={() => setMenuId(null)}>Remove</button></div>}
        <button className="floating-add" onClick={() => setModalOpen(true)} aria-label="Add document"><IconImage src={assets.plus} /></button>
        <BottomNav active="home" onChange={() => undefined} />
      </div>
      {modalOpen && <AddDocumentModal onClose={() => setModalOpen(false)} onAdd={handleAdd} />}
    </main>
  );
}
