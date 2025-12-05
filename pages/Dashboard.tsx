import React, { useEffect, useState } from 'react';
import { Users, CloudSun, MapPin, Sun, Cloud, CloudDrizzle, CloudRain, Clock, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';
import { getActivities, getUsers } from '../services/dataService';
import { Activity, User } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

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
        setActivities(acts);
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
  const completedCount = activities.filter(a => a.status === 'Completada').length;

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

      {/* KPI GRID - 4 Cols including Completed */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Trabajadores Activos" value={workerCount.toString()} icon={Users} color="bg-blue-500" />
        <StatCard title="Actividades Pendientes" value={pendingCount.toString()} icon={Clock} color="bg-orange-500" />
        <StatCard title="Actividades en Progreso" value={inProgressCount.toString()} icon={TrendingUp} color="bg-indigo-500" />
        <StatCard title="Actividades Completadas" value={completedCount.toString()} icon={CheckCircle2} color="bg-green-500" />
      </div>

      <hr className="border-slate-200" />

      {/* MAP & WEATHER ROW */}
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

                        {/* Chart Container with fixed dimensions to prevent Recharts width(-1) error */}
                        <div className="w-full h-40 mt-4 min-w-0 relative">
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
    </div>
  );
};

export default Dashboard;