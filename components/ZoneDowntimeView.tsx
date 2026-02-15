import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TranslationSet } from '../types';
import { Clock, TrendingDown, BarChart3, Calendar, Download } from 'lucide-react';

interface ZoneDowntimeViewProps {
  t: TranslationSet;
}

interface DowntimeRecord {
  zone: string;
  containerId: string;
  endTime: string;
  nextContainerId: string;
  nextStartTime: string;
  downtimeMinutes: number;
}

interface ZoneStats {
  zone: string;
  totalDowntimeMinutes: number;
  averageDowntimeMinutes: number;
  downtimeCount: number;
  records: DowntimeRecord[];
}

const ZoneDowntimeView: React.FC<ZoneDowntimeViewProps> = ({ t }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    loadDowntimeData();
  }, [date]);

  const loadDowntimeData = async () => {
    setLoading(true);
    const [y, m, day] = date.split('-');
    const formattedDate = `${day}.${m}`;
    
    // Получаем все задачи за день
    const tasks = await api.fetchHistory(formattedDate);
    
    // Группируем по зонам и рассчитываем простои
    const zoneMap = new Map<string, DowntimeRecord[]>();
    
    // Сортируем задачи по времени завершения
    const completedTasks = tasks
      .filter(t => t.end_time && t.zone)
      .sort((a, b) => {
        const timeA = parseTime(a.end_time!);
        const timeB = parseTime(b.end_time!);
        return timeA - timeB;
      });
    
    // Для каждой зоны находим простои
    const zones = [...new Set(completedTasks.map(t => t.zone!))];
    
    zones.forEach(zone => {
      const zoneTasks = completedTasks.filter(t => t.zone === zone);
      const downtimes: DowntimeRecord[] = [];
      
      for (let i = 0; i < zoneTasks.length - 1; i++) {
        const current = zoneTasks[i];
        const next = zoneTasks[i + 1];
        
        if (current.end_time && next.start_time) {
          const endTime = parseTime(current.end_time);
          const startTime = parseTime(next.start_time);
          
          // Простой = время между концом текущей и началом следующей
          const downtimeMinutes = (startTime - endTime) / (1000 * 60);
          
          // Учитываем только положительные простои (больше 1 минуты)
          if (downtimeMinutes > 1) {
            downtimes.push({
              zone,
              containerId: current.id,
              endTime: current.end_time,
              nextContainerId: next.id,
              nextStartTime: next.start_time,
              downtimeMinutes: Math.round(downtimeMinutes)
            });
          }
        }
      }
      
      if (downtimes.length > 0) {
        zoneMap.set(zone, downtimes);
      }
    });
    
    // Формируем статистику
    const stats: ZoneStats[] = [];
    zoneMap.forEach((records, zone) => {
      const totalDowntime = records.reduce((sum, r) => sum + r.downtimeMinutes, 0);
      stats.push({
        zone,
        totalDowntimeMinutes: totalDowntime,
        averageDowntimeMinutes: Math.round(totalDowntime / records.length),
        downtimeCount: records.length,
        records
      });
    });
    
    // Сортируем по общему времени простоя (худшие зоны сверху)
    stats.sort((a, b) => b.totalDowntimeMinutes - a.totalDowntimeMinutes);
    
    setZoneStats(stats);
    setLoading(false);
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const today = new Date();
    today.setHours(hours, minutes, 0, 0);
    return today.getTime();
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}ч ${mins}мин`;
    }
    return `${mins}мин`;
  };

  const getTotalDowntime = (): number => {
    return zoneStats.reduce((sum, z) => sum + z.totalDowntimeMinutes, 0);
  };

  const getAverageDowntime = (): number => {
    if (zoneStats.length === 0) return 0;
    return Math.round(getTotalDowntime() / zoneStats.length);
  };

  const exportToCSV = () => {
    let csv = 'Зона,Контейнер (окончание),Время окончания,Следующий контейнер,Время начала,Простой (мин)\n';
    
    zoneStats.forEach(stat => {
      stat.records.forEach(record => {
        csv += `${record.zone},${record.containerId},${record.endTime},${record.nextContainerId},${record.nextStartTime},${record.downtimeMinutes}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `zone_downtime_${date}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col gap-6 h-full flex-1 min-h-0">
      
      {/* Header Card */}
      <div className="bg-card-bg backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <TrendingDown className="text-white w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Анализ простоев зон</h2>
              <p className="text-sm text-white/50 font-medium">Время между выгрузками по зонам</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl p-2 border border-white/10">
              <Calendar className="text-white/50" size={20} />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-white font-mono text-lg outline-none border-none [color-scheme:dark]"
              />
            </div>
            
            {zoneStats.length > 0 && (
              <button 
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-colors font-bold text-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Экспорт CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && zoneStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card-bg backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-red-400 w-5 h-5" />
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Общий простой</span>
            </div>
            <div className="text-4xl font-black text-white tabular-nums">{formatMinutes(getTotalDowntime())}</div>
          </div>

          <div className="bg-card-bg backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="text-yellow-400 w-5 h-5" />
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Средний простой</span>
            </div>
            <div className="text-4xl font-black text-white tabular-nums">{formatMinutes(getAverageDowntime())}</div>
          </div>

          <div className="bg-card-bg backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingDown className="text-blue-400 w-5 h-5" />
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Всего зон</span>
            </div>
            <div className="text-4xl font-black text-white tabular-nums">{zoneStats.length}</div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-card-bg backdrop-blur-xl border border-white/10 rounded-3xl flex-1 min-h-0 flex flex-col shadow-2xl overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-white/30 animate-pulse">
            Загрузка данных...
          </div>
        ) : zoneStats.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-4">
            <Clock size={64} strokeWidth={1} />
            <div className="text-xl font-bold">Нет данных за эту дату</div>
            <p className="text-sm text-white/20">Выберите другую дату или дождитесь завершения работ</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            
            {/* Zone List */}
            <div className="p-6 space-y-4">
              {zoneStats.map((stat, idx) => (
                <div 
                  key={stat.zone}
                  className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:bg-white/10 transition-all"
                >
                  {/* Zone Header */}
                  <div 
                    className="p-5 flex items-center justify-between cursor-pointer"
                    onClick={() => setSelectedZone(selectedZone === stat.zone ? null : stat.zone)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${
                        idx === 0 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        idx === 1 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {stat.zone}
                      </div>
                      
                      <div>
                        <div className="text-sm text-white/40 font-bold uppercase tracking-wider">Зона выгрузки</div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-white/60 text-sm">
                            <span className="font-bold text-white">{stat.downtimeCount}</span> простоев
                          </span>
                          <span className="text-white/30">•</span>
                          <span className="text-white/60 text-sm">
                            Среднее: <span className="font-bold text-white">{formatMinutes(stat.averageDowntimeMinutes)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Общий простой</div>
                      <div className="text-3xl font-black text-white tabular-nums">
                        {formatMinutes(stat.totalDowntimeMinutes)}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedZone === stat.zone && (
                    <div className="border-t border-white/5 bg-black/20 p-5 animate-in slide-in-from-top-2 duration-200">
                      <div className="space-y-3">
                        {stat.records.map((record, rIdx) => (
                          <div 
                            key={rIdx}
                            className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5"
                          >
                            <div className="flex items-center gap-6">
                              <div>
                                <div className="text-xs text-white/40 mb-1">Завершил</div>
                                <div className="font-mono text-white font-bold">{record.containerId}</div>
                                <div className="text-xs text-green-400 font-mono mt-0.5">{record.endTime}</div>
                              </div>
                              
                              <div className="text-white/20">→</div>
                              
                              <div>
                                <div className="text-xs text-white/40 mb-1">Начал</div>
                                <div className="font-mono text-white font-bold">{record.nextContainerId}</div>
                                <div className="text-xs text-blue-400 font-mono mt-0.5">{record.nextStartTime}</div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-xs text-white/40 mb-1">Простой</div>
                              <div className={`text-2xl font-black tabular-nums ${
                                record.downtimeMinutes > 30 ? 'text-red-400' :
                                record.downtimeMinutes > 15 ? 'text-yellow-400' :
                                'text-green-400'
                              }`}>
                                {formatMinutes(record.downtimeMinutes)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ZoneDowntimeView;
