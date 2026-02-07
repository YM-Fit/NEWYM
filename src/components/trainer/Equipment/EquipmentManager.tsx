import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ArrowRight, Package, Dumbbell } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

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
      resistance_band: 'Resistance Bands',
      leg_band: 'Leg/Glute Bands',
      bar: 'Bars',
      pulley_attachment: 'Pulley Attachments',
      suspension: 'TRX/Suspension',
      balance: 'Balance',
      ball: 'Balls',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'resistance_band', label: 'Resistance Bands' },
    { id: 'leg_band', label: 'Leg Bands' },
    { id: 'bar', label: 'Bars' },
    { id: 'pulley_attachment', label: 'Pulley' },
    { id: 'suspension', label: 'TRX' },
    { id: 'balance', label: 'Balance' },
    { id: 'ball', label: 'Balls' },
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-muted400 font-medium">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-4 lg:p-8">
      {/* Premium Header Card */}
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-white/10 p-6 lg:p-8 mb-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 rounded-2xl shadow-lg">
              <Dumbbell className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Equipment Manager</h1>
              <p className="text-muted400 mt-1">Manage your training equipment inventory</p>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter(cat.id)}
              className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 ${
                filter === cat.id
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 scale-105'
                  : 'bg-surface800/60 text-muted400 hover:bg-surface700/60 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Groups */}
      <div className="space-y-8">
        {Object.entries(groupedEquipment).map(([category, items]) => (
          <div key={category} className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-white/10 p-6 lg:p-8 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-emerald-600/20 to-emerald-500/20 rounded-xl">
                <Package className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {getCategoryLabel(category)}
              </h2>
              <span className="text-sm text-muted500 bg-surface800/50 px-3 py-1 rounded-lg">
                {items.length} items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div
                  key={item.id}
                  className="group border-2 border-border700/50 rounded-2xl p-5 bg-surface800/30 hover:border-emerald-500/50 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-emerald-600/5 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-[1.02]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <span className="text-3xl filter drop-shadow-lg">{item.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-white group-hover:text-emerald-300 transition-colors duration-300">{item.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {item.weight_kg && (
                            <span className="text-xs text-muted400 bg-surface700/50 px-2.5 py-1 rounded-lg font-medium">
                              {item.weight_kg} kg
                            </span>
                          )}
                          {item.resistance_level && (
                            <span className="text-xs text-muted400 bg-surface700/50 px-2.5 py-1 rounded-lg font-medium">
                              Level {item.resistance_level}/5
                            </span>
                          )}
                          {item.is_bodyweight && (
                            <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg font-medium">
                              Bodyweight
                            </span>
                          )}
                        </div>
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
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl shadow-xl border border-white/10 p-16 text-center backdrop-blur-sm">
          <div className="p-4 bg-surface800/50 rounded-2xl inline-block mb-4">
            <Package className="h-12 w-12 text-muted600" />
          </div>
          <p className="text-muted400 text-lg font-medium">No equipment found in this category</p>
          <p className="text-muted500 text-sm mt-2">Try selecting a different category or add new equipment</p>
        </div>
      )}
    </div>
  );
}
