import { FaPlus } from 'react-icons/fa';

export default function FAB({ onClick }) {
  return (
    <button className="fab" onClick={onClick} aria-label="Add card">
      <FaPlus size={22} />
    </button>
  );
}
