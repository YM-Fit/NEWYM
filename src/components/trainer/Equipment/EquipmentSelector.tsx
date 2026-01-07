import { useState, useEffect } from 'react';
import { X, Search, Package, Check } from 'lucide-react';
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
      resistance_band: 'Resistance Bands',
      leg_band: 'Leg Bands',
      bar: 'Bars',
      pulley_attachment: 'Pulley',
      suspension: 'TRX',
      balance: 'Balance',
      ball: 'Balls',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const categories = [
    { id: 'all', label: 'All', emoji: '' },
    { id: 'resistance_band', label: 'Bands', emoji: '' },
    { id: 'leg_band', label: 'Legs', emoji: '' },
    { id: 'bar', label: 'Bars', emoji: '' },
    { id: 'pulley_attachment', label: 'Pulley', emoji: '' },
    { id: 'suspension', label: 'TRX', emoji: '' },
    { id: 'balance', label: 'Balance', emoji: '' },
    { id: 'ball', label: 'Balls', emoji: '' },
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
      className="fixed inset-0 backdrop-blur-sm bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 lg:p-8 border-b border-white/10 bg-gradient-to-br from-gray-800/50 to-gray-900/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-2xl shadow-lg">
                <Package className="h-6 w-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Select Equipment</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search equipment..."
              className="w-full pr-12 pl-4 py-4 bg-gray-800/80 border-2 border-gray-700/50 rounded-2xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300"
            />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilter(cat.id)}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition-all duration-300 flex items-center space-x-2 rtl:space-x-reverse ${
                  filter === cat.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'bg-gray-800/60 text-gray-400 hover:bg-gray-700/60 hover:text-white'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* No Equipment Option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`w-full mb-6 p-5 rounded-2xl border-2 transition-all duration-300 text-right group ${
              !currentEquipmentId
                ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shadow-lg shadow-emerald-500/10'
                : 'border-gray-700/50 hover:border-emerald-500/30 bg-gray-800/30 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/5'
            } hover:scale-[1.01]`}
          >
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`p-3 rounded-2xl ${!currentEquipmentId ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30' : 'bg-gray-700/50 group-hover:bg-emerald-500/20'} transition-all duration-300`}>
                <X className={`h-6 w-6 ${!currentEquipmentId ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-400'} transition-colors duration-300`} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">No Equipment</h3>
                <p className="text-sm text-gray-400">Regular set without additional equipment</p>
              </div>
              {!currentEquipmentId && (
                <div className="ml-auto">
                  <Check className="h-6 w-6 text-emerald-400" />
                </div>
              )}
            </div>
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-400 font-medium">Loading equipment...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedEquipment).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-lg font-bold text-gray-300 mb-4 px-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></span>
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`group p-5 rounded-2xl border-2 transition-all duration-300 text-right ${
                          currentEquipmentId === item.id
                            ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 shadow-lg shadow-emerald-500/10'
                            : 'border-gray-700/50 hover:border-emerald-500/30 bg-gray-800/30 hover:bg-gradient-to-br hover:from-emerald-500/5 hover:to-teal-500/5'
                        } hover:scale-[1.02] hover:shadow-xl`}
                      >
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          <span className="text-4xl lg:text-5xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">{item.emoji}</span>
                          <div className="flex-1">
                            <h3 className="font-bold text-base lg:text-lg text-white group-hover:text-emerald-300 transition-colors duration-300">
                              {item.name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.weight_kg && (
                                <span className="text-xs lg:text-sm text-gray-400 bg-gray-700/50 px-2.5 py-1 rounded-lg font-medium">
                                  {item.weight_kg} kg
                                </span>
                              )}
                              {item.resistance_level && (
                                <span className="text-xs lg:text-sm text-gray-400 bg-gray-700/50 px-2.5 py-1 rounded-lg font-medium">
                                  Level {item.resistance_level}/5
                                </span>
                              )}
                              {item.is_bodyweight && (
                                <span className="text-xs lg:text-sm text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-lg font-medium">
                                  Bodyweight
                                </span>
                              )}
                            </div>
                          </div>
                          {currentEquipmentId === item.id && (
                            <Check className="h-6 w-6 text-emerald-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredEquipment.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 bg-gray-800/50 rounded-2xl inline-block mb-4">
                <Package className="h-12 w-12 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg font-medium">No matching equipment found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
