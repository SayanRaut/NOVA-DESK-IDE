import React from 'react';
import { useAppStore, SidebarView } from '../../store/appStore';

const activityItems: { id: SidebarView; icon: string; tooltip: string }[] = [
  { id: 'explorer', icon: '📁', tooltip: 'Explorer' },
  { id: 'search', icon: '🔍', tooltip: 'Search' },
  { id: 'git', icon: '🔀', tooltip: 'Source Control' },
  { id: 'docker', icon: '🐳', tooltip: 'Docker' },
  { id: 'chat', icon: '💬', tooltip: 'AI Chat' },
];

const ActivityBar: React.FC = () => {
  const { sidebarView, setSidebarView, sidebarVisible, toggleSidebar, toggleBottomPanel, setShowSettings } = useAppStore();

  const handleClick = (id: SidebarView) => {
    if (sidebarView === id && sidebarVisible) {
      toggleSidebar();
    } else {
      setSidebarView(id);
    }
  };

  return (
    <div className="activity-bar">
      {activityItems.map((item) => (
        <button
          key={item.id}
          className={`activity-btn ${sidebarView === item.id && sidebarVisible ? 'active' : ''}`}
          onClick={() => handleClick(item.id)}
          title={item.tooltip}
        >
          {item.icon}
        </button>
      ))}

      <div className="activity-spacer" />

      <button
        className="activity-btn"
        onClick={toggleBottomPanel}
        title="Toggle Terminal"
      >
        💻
      </button>
      <button
        className="activity-btn"
        onClick={() => setShowSettings(true)}
        title="Settings"
      >
        ⚙️
      </button>
    </div>
  );
};

export default ActivityBar;
