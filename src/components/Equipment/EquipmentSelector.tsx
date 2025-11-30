import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Equipment {
  id: string;
  name: string;
  category: string;
  emoji: string | null;
  weight_kg: number | null;
  resistance_level: number | null;
  color: string | null;
  is_bodyweight: boolean;
}

interface EquipmentSelectorProps {
  onSelect: (equipment: Equipment | null) => void;
  onClose: () => void;
  currentEquipmentId?: string | null;
}

export default function EquipmentSelector({ onSelect, onClose, currentEquipmentId }: EquipmentSelectorProps) {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadEquipment();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const loadEquipment = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('equipment')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setEquipment(data);
    }
    setLoading(false);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      resistance_band: 'גומיות התנגדות',
      leg_band: 'גומיות רגליים',
      bar: 'מוטות',
      pulley_attachment: 'פולי',
      suspension: 'TRX',
      balance: 'איזון',
      ball: 'כדורים',
      other: 'אחר',
    };
    return labels[category] || category;
  };

  const categories = [
    { id: 'all', label: 'הכל', emoji: '📦' },
    { id: 'resistance_band', label: 'גומיות', emoji: '🔴' },
    { id: 'leg_band', label: 'רגליים', emoji: '⚫' },
    { id: 'bar', label: 'מוטות', emoji: '━' },
    { id: 'pulley_attachment', label: 'פולי', emoji: '🪢' },
    { id: 'suspension', label: 'TRX', emoji: '🔗' },
    { id: 'balance', label: 'איזון', emoji: '⚪' },
    { id: 'ball', label: 'כדורים', emoji: '🔵' },
  ];

  const filteredEquipment = equipment.filter(e => {
    const matchesCategory = filter === 'all' || e.category === filter;
    const matchesSearch = searchQuery === '' ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  const handleSelect = (item: Equipment | null) => {
    onSelect(item);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">בחר ציוד</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש ציוד..."
              className="w-full pr-10 pl-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center space-x-2 rtl:space-x-reverse ${
                  filter === cat.id
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full mb-4 p-4 rounded-xl border-2 transition-all text-right ${
              !currentEquipmentId
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
          >
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <span className="text-2xl">⭕</span>
              <div>
                <h3 className="font-bold text-lg text-gray-900">ללא ציוד</h3>
                <p className="text-sm text-gray-600">סט רגיל ללא ציוד נוסף</p>
              </div>
            </div>
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">טוען ציוד...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEquipment).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-lg font-bold text-gray-700 mb-2 px-2">
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`p-4 rounded-xl border-2 transition-all text-right ${
                          currentEquipmentId === item.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-green-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <span className="text-3xl lg:text-4xl">{item.emoji}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-base lg:text-lg text-gray-900">
                              {item.name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.weight_kg && (
                                <span className="text-xs lg:text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  {item.weight_kg} ק״ג
                                </span>
                              )}
                              {item.resistance_level && (
                                <span className="text-xs lg:text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                  רמה {item.resistance_level}/5
                                </span>
                              )}
                              {item.is_bodyweight && (
                                <span className="text-xs lg:text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                                  משקל גוף
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredEquipment.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">לא נמצא ציוד מתאים</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
