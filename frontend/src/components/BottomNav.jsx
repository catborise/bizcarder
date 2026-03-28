import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaHome, FaAddressBook, FaIdCard } from 'react-icons/fa';

const tabs = [
  { path: '/', icon: FaHome, labelKey: 'common:dashboard' },
  { path: '/contacts', icon: FaAddressBook, labelKey: 'common:contacts' },
  { path: '/my-card', icon: FaIdCard, labelKey: 'common:myCard' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, icon: Icon, labelKey }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
            <span>{t(labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
