import { useState, useEffect } from 'react';
import { Search, Package, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';

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
      resistance_band: 'רצועות התנגדות',
      leg_band: 'רצועות רגליים',
      bar: 'מוטות',
      pulley_attachment: 'כבל',
      suspension: 'TRX',
      balance: 'שיווי משקל',
      ball: 'כדורים',
      other: 'אחר',
    };
    return labels[category] || category;
  };

  const categories = [
    { id: 'all', label: 'הכל', emoji: '' },
    { id: 'resistance_band', label: 'רצועות', emoji: '' },
    { id: 'leg_band', label: 'רגליים', emoji: '' },
    { id: 'bar', label: 'מוטות', emoji: '' },
    { id: 'pulley_attachment', label: 'כבל', emoji: '' },
    { id: 'suspension', label: 'TRX', emoji: '' },
    { id: 'balance', label: 'שיווי משקל', emoji: '' },
    { id: 'ball', label: 'כדורים', emoji: '' },
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
    <Modal
      isOpen={true}
      onClose={onClose}
      title="בחירת ציוד"
      size="full"
    >
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Package className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">בחר ציוד לכל סט</p>
              <p className="text-xs text-zinc-500">החיפוש והפילטרים מעודכנים לפי רשימת הציוד שלך</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
            <span>לחיצה על כרטיס תבחר את הציוד</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 md:gap-6 items-start">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש ציוד..."
                className="pr-9"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  type="button"
                  variant={filter === cat.id ? 'primary' : 'ghost'}
                  size="sm"
                  className={`whitespace-nowrap ${
                    filter === cat.id
                      ? 'bg-emerald-500 text-white'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  onClick={() => setFilter(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            <Button
              type="button"
              variant={!currentEquipmentId ? 'primary' : 'secondary'}
              size="md"
              className="w-full justify-between"
              onClick={() => handleSelect(null)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-xl ${
                    !currentEquipmentId
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span className="text-sm font-semibold">ללא</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ללא ציוד
                  </p>
                  <p className="text-xs text-zinc-400">
                    סט רגיל ללא ציוד נוסף
                  </p>
                </div>
              </div>
              {!currentEquipmentId && <Check className="h-5 w-5 text-emerald-400" />}
            </Button>
          </div>

          <div className="min-h-[220px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                  <p className="text-sm text-zinc-400">טוען ציוד...</p>
                </div>
              </div>
            ) : filteredEquipment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-dashed border-zinc-700/70 bg-zinc-900/40">
                <div className="p-4 rounded-2xl bg-zinc-800/60 mb-3">
                  <Package className="h-10 w-10 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-300 mb-1">
                  לא נמצא ציוד תואם
                </p>
                <p className="text-xs text-zinc-500">
                  נסה לשנות את החיפוש או הפילטרים
                </p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[52vh] overflow-y-auto pr-1">
                {Object.entries(groupedEquipment).map(([category, items]) => (
                  <div key={category}>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-emerald-500 to-teal-500" />
                      <h3 className="text-sm font-semibold text-zinc-300">
                        {getCategoryLabel(category)}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={`group flex items-center gap-3 p-3 rounded-2xl border text-right transition-all ${
                            currentEquipmentId === item.id
                              ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                              : 'border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/40 hover:bg-emerald-500/5'
                          }`}
                        >
                          <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-200">
                            {item.emoji}
                          </span>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-white group-hover:text-emerald-300">
                              {item.name}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {item.weight_kg && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800/80 text-[11px] text-zinc-300">
                                  {item.weight_kg} ק&quot;ג
                                </span>
                              )}
                              {item.resistance_level && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800/80 text-[11px] text-zinc-300">
                                  רמה {item.resistance_level}/5
                                </span>
                              )}
                              {item.is_bodyweight && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-[11px] text-emerald-300">
                                  משקל גוף
                                </span>
                              )}
                            </div>
                          </div>
                          {currentEquipmentId === item.id && (
                            <Check className="h-5 w-5 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
