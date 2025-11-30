import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ArrowRight } from 'lucide-react';
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

export default function EquipmentManager() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadEquipment();
  }, []);

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
      leg_band: 'גומיות לרגליים/ישבן',
      bar: 'מוטות',
      pulley_attachment: 'אביזרים לפולי',
      suspension: 'TRX/תלייה',
      balance: 'איזון',
      ball: 'כדורים',
      other: 'אחר',
    };
    return labels[category] || category;
  };

  const categories = [
    { id: 'all', label: 'הכל' },
    { id: 'resistance_band', label: 'גומיות התנגדות' },
    { id: 'leg_band', label: 'גומיות רגליים' },
    { id: 'bar', label: 'מוטות' },
    { id: 'pulley_attachment', label: 'פולי' },
    { id: 'suspension', label: 'TRX' },
    { id: 'balance', label: 'איזון' },
    { id: 'ball', label: 'כדורים' },
  ];

  const filteredEquipment = filter === 'all'
    ? equipment
    : equipment.filter(e => e.category === filter);

  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, Equipment[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">טוען ציוד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">ניהול ציוד</h1>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                filter === cat.id
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedEquipment).map(([category, items]) => (
          <div key={category} className="bg-white rounded-xl shadow-sm p-4 lg:p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {getCategoryLabel(category)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-green-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-2xl">{item.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        {item.weight_kg && (
                          <p className="text-sm text-gray-600">{item.weight_kg} ק״ג</p>
                        )}
                        {item.resistance_level && (
                          <p className="text-sm text-gray-600">
                            רמת התנגדות: {item.resistance_level}/5
                          </p>
                        )}
                        {item.is_bodyweight && (
                          <p className="text-sm text-green-600">משקל גוף</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-500 text-lg">לא נמצא ציוד בקטגוריה זו</p>
        </div>
      )}
    </div>
  );
}
