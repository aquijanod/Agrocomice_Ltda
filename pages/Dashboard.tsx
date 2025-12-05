import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CloudSun, Calendar as CalIcon, MapPin, Sun, Wind, Droplets, ChevronLeft, ChevronRight, Clock, Filter, X, Eye, TrendingUp, CloudRain, Cloud, CloudDrizzle, Umbrella, Loader2 } from 'lucide-react';
import { getActivities, getUsers } from '../services/dataService';
import { Activity, User, ActivityStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType; color: string }> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-full ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
      <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

// Helper para mapear códigos WMO de Open-Meteo a Iconos/Textos
const getWeatherInfo = (code: number) => {
    if (code === 0) return { label: 'Despejado', icon: Sun };
    if (code === 1 || code === 2 || code === 3) return { label: 'Parcialmente Nublado', icon: CloudSun };
    if (code >= 45 && code <= 48) return { label: 'Niebla', icon: Cloud };
    if (code >= 51 && code <= 55) return { label: 'Llovizna', icon: CloudDrizzle };
    if (code >= 61 && code <= 67) return { label: 'Lluvia', icon: CloudRain };
    if (code >= 71 && code <= 77) return { label: 'Nieve', icon: CloudRain }; 
    if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: CloudRain };
    if (code >= 95) return { label: 'Tormenta', icon: CloudRain };
    return { label: 'Nublado', icon: Cloud };
};

type WeatherMetric = 'temp' | 'precip' | 'wind';

const Dashboard: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // State for Filters
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'Todos'>('Todos');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // State for View Modal
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);

  // Calendar State
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // --- WEATHER WIDGET STATE ---
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [activeMetric, setActiveMetric] = useState<WeatherMetric>('temp');
  
  // Estado para datos reales del clima
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(true);

  // Coordenadas Colbún (según mapa)
  const LAT = -35.6789825;
  const LON = -71.4169345;

  useEffect(() => {
    // 1. Load CRM Data
    const loadData = async () => {
        const [acts, usrs] = await Promise.all([getActivities(), getUsers()]);
        const sorted = acts.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setActivities(sorted);
        setUsers(usrs);
    };
    loadData();

    // 2. Fetch Real Weather Data form Open-Meteo
    const fetchWeather = async () => {
        try {
            setLoadingWeather(true);
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=temperature_2m,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
            );
            const data = await response.json();

            // Transform API data to our UI structure
            const mappedData = data.daily.time.map((dateStr: string, index: number) => {
                const dateObj = new Date(dateStr + 'T00:00:00'); // Force local midnight
                const dayName = index === 0 ? 'Hoy' : dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                const fullDay = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
                const weatherInfo = getWeatherInfo(data.daily.weather_code[index]);
                
                // Logic for Hourly Data Graph
                let hourlyIndices: number[] = [];
                
                if (index === 0) {
                    // Para HOY: Rolling Window de 24 horas desde la hora actual
                    const currentHour = new Date().getHours();
                    // Open-Meteo hourly data starts at 00:00 of the requested period.
                    // The flat array index roughly corresponds to hours since start.
                    // We take 8 points spaced by 3 hours (24h total coverage)
                    for (let i = 0; i < 8; i++) {
                        hourlyIndices.push(currentHour + (i * 3));
                    }
                } else {
                    // Para días FUTUROS: Mostrar el día completo (00:00 a 21:00)
                    const startDayIdx = index * 24;
                    const fixedHours = [0, 3, 6, 9, 12, 15, 18, 21];
                    hourlyIndices = fixedHours.map(h => startDayIdx + h);
                }
                
                const hourly = hourlyIndices.map(globalIdx => {
                    // Safety check for array bounds
                    if (globalIdx >= data.hourly.time.length) return null;

                    // Parse ISO time string from API to get nice label
                    const timeStr = data.hourly.time[globalIdx];
                    const timeObj = new Date(timeStr);
                    const label = timeObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

                    return {
                        time: label,
                        temp: Math.round(data.hourly.temperature_2m[globalIdx]),
                        precip: data.hourly.precipitation_probability[globalIdx],
                        wind: Math.round(data.hourly.wind_speed_10m[globalIdx])
                    };
                }).filter(Boolean); // Filter out nulls if we went out of bounds

                // Calculate daily stats based on the FULL day data (not just the graph window)
                const dayStartIdx = index * 24;
                const dayEndIdx = dayStartIdx + 24;
                const dailyWindSlice = data.hourly.wind_speed_10m.slice(dayStartIdx, dayEndIdx);
                const maxWind = dailyWindSlice.length ? Math.round(Math.max(...dailyWindSlice)) : 0;

                return {
                    id: index,
                    day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                    fullDay: fullDay,
                    date: index === 0 ? 'Actual' : 'Pronóstico',
                    max: Math.round(data.daily.temperature_2m_max[index]),
                    min: Math.round(data.daily.temperature_2m_min[index]),
                    current: index === 0 ? Math.round(data.current.temperature_2m) : Math.round(data.daily.temperature_2m_max[index]),
                    condition: weatherInfo.label,
                    icon: weatherInfo.icon,
                    hourly: hourly,
                    humidity: index === 0 ? data.current.relative_humidity_2m : 50, // Forecast API doesn't give daily humidity avg easily, using current or placeholder
                    wind: index === 0 ? Math.round(data.current.wind_speed_10m) : maxWind,
                    rainProb: data.daily.precipitation_probability_max[index]
                };
            });

            setWeatherData(mappedData);
        } catch (error) {
            console.error("Error fetching weather:", error);
            // Fallback en caso de error de red
        } finally {
            setLoadingWeather(false);
        }
    };

    fetchWeather();
  }, []);

  const currentWeatherData = weatherData[selectedDayIndex] || {
      // Placeholder while loading
      current: 0, condition: 'Cargando...', fullDay: '...', rainProb: 0, humidity: 0, wind: 0, hourly: [], icon: Sun
  };

  // Filtered Counts (Static KPIs)
  const workerCount = users.filter(u => u.role === 'Trabajador').length;
  const pendingCount = activities.filter(a => a.status === 'Pendiente').length;
  const inProgressCount = activities.filter(a => a.status === 'En Progreso').length;

  // Calendar Logic
  const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay(); 
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start

  const changeMonth = (delta: number) => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + delta, 1));
  };

  const handleDayClick = (day: number) => {
      const newDate = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day);
      if (selectedDate && newDate.getTime() === selectedDate.getTime()) {
          setSelectedDate(null);
      } else {
          setSelectedDate(newDate);
      }
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Sin asignar';

  const formatDate = (dateStr: string | undefined) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      return dateStr;
  };

  const getActivitiesForDay = (day: number) => {
      const dateStr = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day).toISOString().split('T')[0];
      return activities.filter(act => {
          const inRange = dateStr >= act.startDate && dateStr <= act.endDate;
          const statusMatch = statusFilter === 'Todos' || act.status === statusFilter;
          return inRange && statusMatch;
      });
  };

  const getFilteredList = () => {
      let filtered = activities;
      if (statusFilter !== 'Todos') {
          filtered = filtered.filter(a => a.status === statusFilter);
      }
      if (selectedDate) {
          const dateStr = selectedDate.toISOString().split('T')[0];
          filtered = filtered.filter(a => dateStr >= a.startDate && dateStr <= a.endDate);
      }
      return filtered;
  };

  const displayList = getFilteredList();

  const getChartConfig = () => {
      switch(activeMetric) {
          case 'precip':
              return { dataKey: 'precip', color: '#3b82f6', fillId: 'colorPrecip', unit: '%', domain: [0, 100] };
          case 'wind':
              return { dataKey: 'wind', color: '#10b981', fillId: 'colorWind', unit: ' km/h', domain: ['dataMin', 'dataMax + 10'] };
          default: 
              return { dataKey: 'temp', color: '#f59e0b', fillId: 'colorTemp', unit: '°', domain: ['dataMin - 5', 'dataMax + 5'] };
      }
  };

  const chartConfig = getChartConfig();

  const CustomTick = (props: any) => {
      const { x, y, payload } = props;
      return (
          <g transform={`translate(${x},${y})`}>
              <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={11}>
                  {payload.value}
              </text>
          </g>
      );
  };
  
  const CustomLabel = (props: any) => {
      const { x, y, value } = props;
      return (
          <text x={x} y={y} dy={-10} fill="#334155" fontSize={12} fontWeight="bold" textAnchor="middle">
              {value}{chartConfig.unit}
          </text>
      );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Panel de Control</h1>
        <p className="text-slate-500">Resumen de operaciones - Agro Comice Ltda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Trabajadores Activos" value={workerCount.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="Actividades Pendientes" value={pendingCount.toString()} icon={Clock} color="bg-orange-500" />
        <StatCard title="Actividades en Progreso" value={inProgressCount.toString()} icon={TrendingUp} color="bg-indigo-500" />
      </div>

      <hr className="border-slate-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-[450px] relative group">
                <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }}
                    loading="lazy" 
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://maps.google.com/maps?q=-35.6789825,-71.4169345&t=k&z=17&ie=UTF8&iwloc=&output=embed"
                    title="Ubicación Colbún"
                ></iframe>
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                    <MapPin size={12} className="text-red-600"/> Fundo Colbún
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[450px] flex flex-col font-sans transition-all">
                
                {loadingWeather ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <Loader2 size={48} className="animate-spin mb-4 text-blue-500"/>
                        <p>Obteniendo datos meteorológicos en tiempo real...</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-start mb-6 animate-fade-in">
                            <div className="flex gap-4">
                                <currentWeatherData.icon size={64} className={`
                                    ${currentWeatherData.condition.includes('Despejado') || currentWeatherData.condition.includes('Soleado') ? 'text-amber-400 fill-amber-400' : ''}
                                    ${currentWeatherData.condition.includes('Nublado') || currentWeatherData.condition.includes('Parcial') ? 'text-slate-400 fill-slate-200' : ''}
                                    ${currentWeatherData.condition.includes('Lluvia') || currentWeatherData.condition.includes('Llovizna') ? 'text-blue-500' : ''}
                                `} />
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <h2 className="text-6xl font-normal text-slate-800 tracking-tight">{currentWeatherData.current}</h2>
                                        <span className="text-xl text-slate-500">°C</span>
                                    </div>
                                    <div className="text-slate-500 text-sm mt-1">
                                        <span className="font-medium text-slate-700">{currentWeatherData.condition}</span>
                                        <span className="mx-2">•</span>
                                        <span className="capitalize">{currentWeatherData.fullDay}</span>
                                    </div>
                                    <p className="text-slate-400 text-xs mt-0.5">Colbún, Maule (En tiempo real)</p>
                                </div>
                            </div>
                            
                            <div className="text-sm text-slate-600 space-y-1 text-right">
                                <p>Precipitaciones: <span className="font-medium text-slate-800">{currentWeatherData.rainProb}%</span></p>
                                <p>Humedad: <span className="font-medium text-slate-800">{currentWeatherData.humidity}%</span></p>
                                <p>Viento: <span className="font-medium text-slate-800">{currentWeatherData.wind} km/h</span></p>
                            </div>
                        </div>

                        <div className="flex border-b border-slate-200 mb-4">
                            <button 
                                onClick={() => setActiveMetric('temp')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeMetric === 'temp' ? 'text-slate-800 border-amber-400' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                            >
                                Temperatura
                            </button>
                            <button 
                                onClick={() => setActiveMetric('precip')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeMetric === 'precip' ? 'text-slate-800 border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                            >
                                Precipitaciones
                            </button>
                            <button 
                                onClick={() => setActiveMetric('wind')}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeMetric === 'wind' ? 'text-slate-800 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-700'}`}
                            >
                                Viento
                            </button>
                        </div>

                        <div className="flex-1 w-full min-h-0 relative -ml-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentWeatherData.hourly} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.05}/>
                                        </linearGradient>
                                        <linearGradient id="colorPrecip" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                                        </linearGradient>
                                        <linearGradient id="colorWind" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="time" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={<CustomTick />}
                                        interval={0}
                                    />
                                    <YAxis hide domain={chartConfig.domain as any} />
                                    <Tooltip 
                                        formatter={(value: any) => [`${value}${chartConfig.unit}`, activeMetric === 'temp' ? 'Temp' : activeMetric === 'precip' ? 'Lluvia' : 'Viento']}
                                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} 
                                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey={chartConfig.dataKey} 
                                        stroke={chartConfig.color} 
                                        strokeWidth={2} 
                                        fillOpacity={1} 
                                        fill={`url(#${chartConfig.fillId})`} 
                                        animationDuration={500}
                                    >
                                        <LabelList content={<CustomLabel />} />
                                    </Area>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex justify-between overflow-x-auto pb-2 scrollbar-hide gap-2">
                                {weatherData.map((day, idx) => (
                                    <div 
                                        key={idx} 
                                        onClick={() => setSelectedDayIndex(idx)}
                                        className={`
                                            flex flex-col items-center min-w-[55px] py-2 px-1 rounded-lg transition-all cursor-pointer border border-transparent
                                            ${selectedDayIndex === idx ? 'bg-blue-50 border-blue-200 shadow-sm transform scale-105' : 'hover:bg-slate-50 text-slate-500'}
                                        `}
                                    >
                                        <span className={`text-sm font-medium mb-2 ${selectedDayIndex === idx ? 'text-blue-700' : 'text-slate-600'}`}>
                                            {day.day}
                                        </span>
                                        <day.icon size={24} className={`mb-2 
                                            ${day.icon === Sun ? 'text-amber-400 fill-amber-400' : 
                                            day.icon === Cloud ? 'text-slate-400 fill-slate-200' : 
                                            (day.icon === CloudDrizzle || day.icon === CloudRain) ? 'text-blue-500' :
                                            'text-slate-500'}
                                        `} />
                                        <div className="text-xs font-bold text-slate-700">
                                            <span>{day.max}°</span>
                                            <span className="text-slate-400 ml-1 font-normal">{day.min}°</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
      </div>

      <hr className="border-slate-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <CalIcon size={20} className="text-blue-600"/> Agenda de Actividades
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg pl-8 pr-8 py-2 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-32 md:w-auto"
                            >
                                <option value="Todos">Todos</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En Progreso">En Progreso</option>
                                <option value="Completada">Completada</option>
                                <option value="Cancelada">Cancelada</option>
                            </select>
                            <Filter size={14} className="absolute left-2.5 top-3 text-slate-400 pointer-events-none"/>
                        </div>
                        {selectedDate && (
                             <button 
                                onClick={() => setSelectedDate(null)}
                                className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                             >
                                 <span className="hidden sm:inline">Día: {selectedDate.getDate()}</span>
                                 <X size={14} />
                             </button>
                        )}
                        <Link to="/activities" className="hidden sm:block text-sm font-medium text-blue-600 hover:underline ml-2">Ver Todo</Link>
                    </div>
                </div>
                
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                    {displayList.length > 0 ? displayList.map(act => (
                        <div key={act.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`w-2 h-2 rounded-full ${
                                        act.status === 'Pendiente' ? 'bg-blue-500' :
                                        act.status === 'En Progreso' ? 'bg-orange-500' :
                                        'bg-green-500'
                                    }`}></span>
                                    <h4 className="font-bold text-slate-800 text-sm">{act.name}</h4>
                                    <span className="text-xs text-slate-400">| {formatDate(act.startDate)}</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 ml-4">{act.description}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                                        act.status === 'Pendiente' ? 'bg-blue-100 text-blue-600' :
                                        act.status === 'En Progreso' ? 'bg-orange-100 text-orange-600' :
                                        'bg-green-100 text-green-600'
                                    }`}>{act.status}</span>
                                <button 
                                    onClick={() => setViewActivity(act)}
                                    title="Ver detalles"
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                >
                                    <Eye size={18} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center">
                            <Clock size={32} className="mb-2 opacity-20"/>
                            <p>No hay actividades para los filtros seleccionados.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                     <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-md transition-shadow text-slate-500"><ChevronLeft size={18}/></button>
                     <h3 className="font-bold text-slate-700 capitalize">
                         {currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                     </h3>
                     <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-md transition-shadow text-slate-500"><ChevronRight size={18}/></button>
                </div>
                
                <div className="p-4">
                    <div className="grid grid-cols-7 mb-2 text-center">
                         {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => (
                             <span key={d} className="text-xs font-bold text-slate-400">{d}</span>
                         ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: startDay }).map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square"></div>
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const dayActivities = getActivitiesForDay(day);
                            const hasActivity = dayActivities.length > 0;
                            const isSelected = selectedDate && 
                                               selectedDate.getDate() === day && 
                                               selectedDate.getMonth() === currentCalendarDate.getMonth() &&
                                               selectedDate.getFullYear() === currentCalendarDate.getFullYear();

                            let bgClass = 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent';
                            if (hasActivity) {
                                if (dayActivities.some(a => a.status === 'En Progreso')) {
                                    bgClass = 'bg-orange-100 text-orange-700 font-bold border border-orange-200';
                                } else if (dayActivities.some(a => a.status === 'Pendiente')) {
                                    bgClass = 'bg-blue-100 text-blue-700 font-bold border border-blue-200';
                                } else if (dayActivities.some(a => a.status === 'Completada')) {
                                    bgClass = 'bg-green-100 text-green-700 font-bold border border-green-200';
                                }
                            }
                            const ringClass = isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : '';

                            return (
                                <button 
                                    key={day} 
                                    onClick={() => handleDayClick(day)}
                                    className={`aspect-square flex items-center justify-center rounded-lg transition-all text-xs ${bgClass} ${ringClass}`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-slate-500 justify-center">
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></span> Pendiente</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200"></span> En Progreso</div>
                        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span> Completada</div>
                    </div>
                </div>
            </div>
      </div>

      {viewActivity && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <CalIcon size={20} className="text-blue-600"/> Detalle de Actividad
                    </h3>
                    <button onClick={() => setViewActivity(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24}/>
                    </button>
                </div>
                <div className="p-6 space-y-6">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Actividad</label>
                        <p className="text-slate-800 font-bold text-lg mt-1">{viewActivity.name}</p>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Descripción</label>
                        <div className="bg-slate-50 p-3 rounded-lg mt-1 border border-slate-100">
                             <p className="text-slate-700 text-sm whitespace-pre-wrap">{viewActivity.description}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha Inicio</label>
                            <p className="text-slate-800 text-sm font-medium mt-1">{formatDate(viewActivity.startDate)}</p>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha Término</label>
                            <p className="text-slate-800 text-sm font-medium mt-1">{formatDate(viewActivity.endDate)}</p>
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado</label>
                            <span className={`inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full text-xs font-bold ${
                                viewActivity.status === 'Pendiente' ? 'bg-blue-100 text-blue-700' :
                                viewActivity.status === 'En Progreso' ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${
                                    viewActivity.status === 'Pendiente' ? 'bg-blue-500' :
                                    viewActivity.status === 'En Progreso' ? 'bg-orange-500' :
                                    'bg-green-500'
                                }`}></span>
                                {viewActivity.status}
                            </span>
                         </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Encargado</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                    {getUserName(viewActivity.assigneeId).charAt(0)}
                                </div>
                                <p className="text-slate-800 text-sm">{getUserName(viewActivity.assigneeId)}</p>
                            </div>
                         </div>
                     </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                    <button onClick={() => setViewActivity(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-800 font-medium text-sm transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;