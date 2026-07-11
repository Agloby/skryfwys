import {
  BookHeart,
  BookOpenCheck,
  ChevronRight,
  CircleHelp,
  Cloud,
  Database,
  FilePenLine,
  HeartHandshake,
  Languages,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { t, viewTitle } from "../i18n";
import type { ApiHealth, AppSettings, UiLanguage, ViewId } from "../types";

interface ShellProps {
  children: ReactNode;
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  settings: AppSettings;
  onLanguageChange: (language: UiLanguage) => void;
  health: ApiHealth;
}

const navGroups = [
  {
    label: "workspace" as const,
    items: [
      { id: "editor" as const, icon: FilePenLine },
      { id: "rewrite" as const, icon: Sparkles },
      { id: "word-helper" as const, icon: BookOpenCheck },
    ],
  },
  {
    label: "library" as const,
    items: [
      { id: "dictionary" as const, icon: BookHeart },
      { id: "terminology" as const, icon: ScrollText },
    ],
  },
  {
    label: "support" as const,
    items: [
      { id: "privacy" as const, icon: ShieldCheck },
      { id: "sources" as const, icon: Database },
      { id: "settings" as const, icon: SlidersHorizontal },
      { id: "diagnostics" as const, icon: Stethoscope },
      { id: "about" as const, icon: CircleHelp },
    ],
  },
];

function privacyLabel(language: UiLanguage, mode: AppSettings["privacyMode"]): string {
  if (mode === "private-server") return t(language, "privateServer");
  if (mode === "cloud-ai") return t(language, "cloudAi");
  return t(language, "local");
}

export function Shell({ children, view, onNavigate, settings, onLanguageChange, health }: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { uiLanguage: language } = settings;

  useEffect(() => setMobileOpen(false), [view]);

  const nav = (
    <>
      <div className="brand-row">
        <div className="brand-mark" aria-hidden="true">
          <Sparkles size={22} strokeWidth={1.9} />
        </div>
        {!collapsed && (
          <div className="brand-copy">
            <strong>Skryfwys</strong>
            <span>Afrikaans, mooi gestel</span>
          </div>
        )}
        <button className="icon-button desktop-collapse" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Vergroot kieslys" : "Verklein kieslys"}>
          {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
        <button className="icon-button mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Sluit navigasie">
          <X size={21} />
        </button>
      </div>

      <nav className="primary-nav" aria-label="Hoofnavigasie">
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            {!collapsed && <div className="nav-heading">{t(language, group.label)}</div>}
            {group.items.map(({ id, icon: Icon }) => (
              <button
                className={`nav-item ${view === id ? "active" : ""}`}
                type="button"
                key={id}
                onClick={() => onNavigate(id)}
                aria-current={view === id ? "page" : undefined}
                title={collapsed ? viewTitle(language, id) : undefined}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                {!collapsed && <span>{viewTitle(language, id)}</span>}
                {!collapsed && view === id && <ChevronRight className="nav-chevron" size={15} aria-hidden="true" />}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        {!collapsed && (
          <div className="local-note">
            <ShieldCheck size={17} aria-hidden="true" />
            <div>
              <strong>{privacyLabel(language, settings.privacyMode)}</strong>
              <span>{settings.privacyMode === "cloud-ai" ? "Uitdruklike toestemming" : "Geen derdeparty-KI"}</span>
            </div>
          </div>
        )}
        <span className="version-label">{collapsed ? "β" : "Beta · v0.1"}</span>
      </div>
    </>
  );

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#main-content">Spring na hoofinhoud</a>
      <aside className="sidebar" aria-label="Skryfwys-kieslys">{nav}</aside>
      {mobileOpen && <button type="button" className="scrim" aria-label="Sluit navigasie" onClick={() => setMobileOpen(false)} />}
      <aside className={`mobile-drawer ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>{nav}</aside>

      <div className="app-column">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button menu-button" type="button" onClick={() => setMobileOpen(true)} aria-label={t(language, "menu")}>
              <Menu size={22} />
            </button>
            <div>
              <span className="eyebrow">Skryfwys</span>
              <h1>{viewTitle(language, view)}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="service-state" type="button" onClick={() => onNavigate("diagnostics")}>
              <span className={`status-dot ${health.status}`} aria-hidden="true" />
              <span>{health.status === "online" ? t(language, "online") : t(language, "offline")}</span>
            </button>
            <button className={`privacy-chip ${settings.privacyMode}`} type="button" onClick={() => onNavigate("privacy")}>
              {settings.privacyMode === "cloud-ai" ? <Cloud size={16} /> : <ShieldCheck size={16} />}
              <span>{privacyLabel(language, settings.privacyMode)}</span>
            </button>
            <button className="language-button" type="button" onClick={() => onLanguageChange(language === "af" ? "en" : "af")} aria-label={t(language, "language")} title={t(language, "language")}>
              <Languages size={17} />
              <span>{language === "af" ? "AF" : "EN"}</span>
            </button>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action && <div className="page-intro-action">{action}</div>}
    </div>
  );
}
